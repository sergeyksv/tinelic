define(['require',"tinybone/backadapter", "safe","lodash","feed/mainres","moment"], function (require,api,safe,_,feed,moment) {
	return function (req, res, cb) {
		var quant = res.locals.quant;
		safe.parallel({
			view:function (cb) {
				require(["views/teamproject/teamproject"], function (view) {
					safe.back(cb, null, view);
				},cb);
			},
			data:function (cb) {
				api("assets.getTeam",res.locals.token, {_t_age:"30d",filter:{name:req.params.teams}}, safe.sure( cb, function (team) {
					var tim = _.pluck(team.projects,'_idp');
					api("assets.getProjects", res.locals.token, {_t_age:"30d",filter:{_id:{$in:tim}}}, safe.sure( cb, function (project) {
						var dt = res.locals.dtstart;
						var dtp = (project._dtPagesErrAck || dt).valueOf()
						var dta = (project._dtActionsErrAck || dt).valueOf();
						var params = {
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
			},
		}, safe.sure(cb, function (r) {
			var filter = {
				_t_age: quant + "m", quant: quant,
				filter: {
					_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
				}
			};
			var views = {total:{}};
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
			 	r.data = _.extend(dataTemplate, r.data);
				views = _.extend(views, r.data);
			res.renderX({view:r.view,data:_.extend(r.data,{quant:quant,title:"Teamproject "+r.data.team.name, stats: views, graphOn: {}})});
		}));
	};
});
