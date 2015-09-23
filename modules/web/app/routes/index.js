define(["require","tinybone/backadapter", "safe","lodash","feed/mainres","moment/moment"], function (require,api,safe,_,feed,moment) {
	return function (req, res, cb) {
		var quant = 5;
		safe.parallel({
			view:function (cb) {
				require(["views/index/index"], function (view) {
					safe.back(cb, null, view);
				},cb);
			},
			data: function (cb) {
				var tolerance = 5 * 60 * 1000;
				var dtend = parseInt(((new Date()).valueOf()+tolerance)/tolerance)*tolerance;
				var dtstart = res.locals.dtend - 20*60*1000;
				api("web.getFeed",res.locals.token, {_t_age:quant+"m", feed:"mainres.homeInfo", params:{quant:quant,filter:{
					_dt: {$gt: dtstart,$lte:dtend}
				}}}, safe.sure(cb, function (r) {
					r.forEach(function (r){
						var period;
						var errAck = r.result.errAck;
						var Apdex = {}; var Server = {}; var Client = {}; var Ajax = {};
						Client.r = Client.e = Client.etu = 0;
						Apdex.client = Apdex.server = Apdex.ajax = 0;
						Ajax.r = Ajax.e = Ajax.etu = 0;
						Server.r = Server.e = Server.etu = Server.proc = Server.mem = 0;
						if (r.result.views.length) {
							period = r.result.views.length;
							_.each(r.result.views, function (v) {
								v = v.value;
								Client.r+=v.r;
								Client.etu+=v.tta;
								Client.e+=v.e/v.r;
								Apdex.client+=v.apdex;
							});

							Client.r=Client.r/period;
							Client.etu=Client.etu/period/1000;
							Client.e=Client.e/period;
							Apdex.client=Apdex.client/period;
						}
						if (r.result.ajax.length) {
							period = r.result.ajax.length;
							_.forEach(r.result.ajax, function (v) {
								v = v.value;
								Ajax.r+=v.r;
								Ajax.etu+=v.tta;
								Ajax.e+=v.e/v.r;
								Apdex.ajax+=v.apdex;
							});

							Ajax.etu=Ajax.etu/period/1000;
							Ajax.e=Ajax.e/period;
							Ajax.r=Ajax.r/period;
							Apdex.ajax=Apdex.ajax/period;
						}
						var trans = 0;
						if (r.result.actions.length) {
							period = r.result.actions.length;
							_.forEach(r.result.actions, function (v) {
								v = v.value;
								Server.e+=v.e/v.r;
								Server.r+=v.r;
								Server.etu+=v.tta;
								Apdex.server+=v.apdex;
							});

							Server.etu=Server.etu/period/1000;
							Server.r=Server.r/period;
							Server.e=Server.e/period;
							Apdex.server=Apdex.server/period;
						}
						if (r.result.metrics) {
							Server.proc = r.result.metrics.proc;
							Server.mem = r.result.metrics.mem;
						}
						_.extend(r, {apdex: Apdex, server: Server, client: Client, ajax: Ajax, errAck: errAck});
					});
					cb(null, r);
				}));
			},
			teams: function (cb) {
				api("assets.getTeams", res.locals.token, {_t_age:quant+"m"}, cb);
			}
		}, safe.sure(cb, function (r) {
			_.forEach(r.teams, function(team) {
				var projects = {};
				_.forEach(r.data, function(proj) {
					projects[proj._id] = proj;
				});
				_.forEach(team.projects, function(proj) {
					proj._t_proj = projects[proj._idp];
				});

				var tmetrics = {};
				_.forEach(team.projects, function(proj){
					_.assign(tmetrics, _.pick(proj._t_proj, 'apdex', 'server', 'client', 'errAck', 'ajax'),
						function(oval, sval, key){
							var memo = {};
							var rpm = 1,k;
							if (key == 'apdex') for (k in sval) {
								if (_.isUndefined(proj._t_proj[k].r)) rpm = 1; else rpm = proj._t_proj[k].r;
								if (_.isUndefined(oval)) memo[k] = sval[k]*rpm; else memo[k] = oval[k] + sval[k]*rpm;
							} else
							for (k in sval) {
								if ((k == 'e')||(k == 'etu')) rpm = sval.r; else rpm = 1;
								if (_.isUndefined(oval)) memo[k] = sval[k]*rpm; else memo[k] = oval[k] + sval[k]*rpm;
							}
							return memo;
						});
				});

				_.forEach(tmetrics.apdex, function(stat, key){
					tmetrics.apdex[key] = stat / tmetrics[key].r;
				});
				_.forEach(_.pick(tmetrics, 'server', 'client', 'ajax'), function(stat, key){
					tmetrics[key].e = stat.e / tmetrics[key].r;
					tmetrics[key].etu = stat.etu / tmetrics[key].r;
				});
				if (tmetrics.server) {
					tmetrics.server.mem = tmetrics.server.mem / tmetrics.server.proc;
				}
				team.t_metrics = tmetrics;
			});

			res.renderX({
				view:r.view,
				data:{
					title:"Tinelic - Home",
					teams: r.teams
				}});
		}));
	};
});
