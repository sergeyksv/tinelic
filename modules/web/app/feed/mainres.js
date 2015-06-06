define(["tinybone/backadapter", "safe","lodash","prefixify"], function (api,safe,_,prefixify) {
	return {
		errorInfo:function (token, params, cb) {
			safe.parallel({
				event:function (cb) {
					api("stats.getPageError",token, _.extend({_t_age:"30d"},params.filter), cb)
				},
				info:function (cb) {
					api("stats.getPageErrorInfo",token, _.extend({_t_age:"10m"},params), cb)
				}
			}, cb)
		},
		serverErrorInfo: function (token, params, cb) {
			safe.parallel({
				event:function (cb) {
					api("stats.getActionError",token, _.extend({_t_age:"30d"},params.filter), cb)
				},
				info:function (cb) {
					api("stats.getActionErrorInfo",token, _.extend({_t_age:"10m"},params), cb)
				}
			}, cb)
		},
		projectInfo:function (token, params, cb) {
			params = prefixify.query(params);
			var dta = params._dtActionsErrAck; delete params._dtActionsErrAck;
			var dtp = params._dtPagesErrAck; delete params._dtPagesErrAck;
			safe.parallel({
				views: function (cb) {
					api("stats.getPageTimings",token, params, cb);
				},
				errors: function (cb) {
					api("stats.getPageErrorStats",token, {
						quant: params.quant,
						filter: {
							_idp: params.filter._idp,
							_dt: {
								$gt: dtp,
								$lte: params.filter._dt.$lte
							}
						}
					}, cb);
				},
				ajax: function (cb) {
					api("stats.getAjaxTimings",token,params, cb);
				},
				actions: function (cb) {
					api("stats.getActionTimings", token, _.merge({filter:{_s_cat:"WebTransaction"}},params), cb);
				},
				topAjax: function (cb) {
					api("stats.getAjaxStats", token, params, cb);
				},
				topPages: function (cb) {
					api("stats.getPageStats", token, params, cb);
				},
				topTransactions: function(cb) {
					api("stats.getActionStats", token, _.merge({filter:{_s_cat:"WebTransaction"}},params), cb);
				},
				serverErrors: function (cb) {
					api("stats.getActionErrorStats",token, {
						quant: params.quant,
						filter: {
							_idp: params.filter._idp,
							_dt: {
								$gt: dta,
								$lte: params.filter._dt.$lte
							}
						}
					}, cb);
				},
				metrics: function (cb) {
					api("stats.getMetricTotals", token, params, cb);
				},
				database: function (cb) {
					api("stats.getActionSegmentStats", token, _.merge({filter:{'data._s_cat':'Datastore'}},params), cb);
				}
			}, cb);
		},
		homeInfo:function (token, params1, cb) {
			params1 = prefixify.query(params1);
			api("assets.getProjects", token, {_t_age:"30d"}, safe.sure(cb, function (projects) {
				safe.forEach(projects, function (projectN, cb) {
					projectN = prefixify.data(projectN);
					var params = {quant:1,filter:_.extend({_idp:projectN._id},params1.filter)}
					safe.parallel({
						errAck: function(cb) {
							var dt = params.filter._dt.$gt
							var dta = projectN._dtActionsErrAck || dt;
							var dtp = projectN._dtPagesErrAck || dt;
							api("stats.getErrorTotals", token, {_idp: projectN._id, _dt:{
								_dtActionsErrAck: dta,
								_dtPagesErrAck: dtp,
								$lte: params.filter._dt.$lte
							}}, cb)
						},
						views: function (cb) {
							api("stats.getPageTimings",token, params, cb);
						},
						errors: function (cb) {
							api("stats.getPageErrorStats",token, params, cb);
						},
						ajax: function (cb) {
							api("stats.getAjaxTimings",token,params, cb);
						},
						actions: function (cb) {
							api("stats.getActionTimings", token,  _.merge({filter:{_s_cat:"WebTransaction"}},params), cb);
						},
						serverErrors: function (cb) {
							api("stats.getActionErrorStats",token, params, cb);
						},
						metrics: function (cb) {
							api("stats.getMetricTotals", token, params, cb)
						}
					}, safe.sure(cb, function(result) {
						projectN.result=result;
						cb(null, projectN)
					}))
				}, safe.sure(cb, function() {
					cb(null, projects)
				}))
			}))
		}
	}
})
