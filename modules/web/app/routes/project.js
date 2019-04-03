define(['require',"tinybone/backadapter", "safe","lodash","feed/mainres","moment"], function (require,api,safe,_,feed,moment) {
	return function (req, res, cb) {
		var quant = res.locals.quant;
		var headline;
		safe.parallel({
			view:function (cb) {
				require(["views/project/project"], function (view) {
					safe.back(cb, null, view);
				},cb);
			},
			data:function (cb) {
				if (req.route.path == "/team/:teams") {
					api("assets.getTeam",res.locals.token, {_t_age:"30d",filter:{name:req.params.teams}}, safe.sure( cb, function (team) {
						var tim = _.pluck(team.projects,'_idp');
						api("assets.getProjects", res.locals.token, {_t_age:"30d",filter:{_id:{$in:tim}}}, safe.sure( cb, function (project) {
							var dt = res.locals.dtstart;
							var dtp = (project._dtPagesErrAck || dt).valueOf();
							var dta = (project._dtActionsErrAck || dt).valueOf();
							var params = {
								_t_age:"10m",
								quant:quant,
								filter:{
									_idp:{$in:tim},
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								},
								_dtActionsErrAck: (dta < dt)?dta:dt,
								_dtPagesErrAck: (dtp < dt)?dtp:dt
							};
							res.locals.dtcliack = dtp;
							res.locals.dtseack = dta;
						return cb(null, {project:project, params:params, team:team});
						}));
					}));
				} else if (req.route.path == "/project/:slug") {
					api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
						var projects=[]; projects[0]=project;
						var dt = res.locals.dtstart;
						var dtp = (project._dtPagesErrAck || dt).valueOf();
						var dta = (project._dtActionsErrAck || dt).valueOf();
						var params = {
							_t_age:"10m",
							quant:quant,
							filter:{
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							},
							_dtActionsErrAck: (dta < dt)?dta:dt,
							_dtPagesErrAck: (dtp < dt)?dtp:dt
						};
						res.locals.dtcliack = dtp;
						res.locals.dtseack = dta;
						return cb(null, {project:project, params: params});
					}));
				}
			}
		}, safe.sure(cb, function (r) {
			var filter = {
				_t_age: quant + "m", quant: quant,
				filter: {
					_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
				}
			};
			var views = {total:{}}; // total | server | browser | transaction | page | ajax
			var dataTemplate = {
				views: [],
				actions: [],
				ajax: [],
				errors: [],
				serverErrors: [],
				topAjax: [],
				topPages: [],
				topTransactions: [],
				database: []
			};
			r.data = _.assign(dataTemplate, r.data);
			views = _.assign(views, r.data);
			headline = r.data.team?"Team "+r.data.team.name:"Project "+r.data.project.name;
			res.renderX({ view: r.view, data: _.assign(r.data,{quant:quant,title:headline, stats: views, graphOn: {}, fr:filter})});
		}));
	};
});
