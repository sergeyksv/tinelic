define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		errorInfo:function (token, params, cb) {
			safe.parallel({
				event:function (cb) {
					api("stats.getEvent",token, _.extend({_t_age:"30d"},params.filter), cb)
				},
				info:function (cb) {
					api("stats.getEventInfo",token, _.extend({_t_age:"10m"},params), cb)
				}
			}, cb)
		},
		serverErrorInfo: function (token, params, cb) {
			safe.parallel({
				event:function (cb) {
					api("stats.getServerError",token, _.extend({_t_age:"30d"},params.filter), cb)
				},
				info:function (cb) {
					api("stats.getServerErrorInfo",token, _.extend({_t_age:"10m"},params), cb)
				}
			}, cb)
		},
		projectInfo:function (token, params, cb) {
			safe.parallel({
				views: function (cb) {
					api("stats.getPageViews",token, params, cb);
				},
				errors: function (cb) {
					api("stats.getPagesErrorStats",token, params, cb);
				},
				ajax: function (cb) {
					api("stats.getAjaxTimings",token,params, cb);
				},
				actions: function (cb) {
					api("stats.getActions", token, params, cb);
				},
				topAjax: function (cb) {
					api("stats.getAjaxStats", token, params, cb);
				},
				topPages: function (cb) {
					api("stats.getTopPages", token, params, cb);
				},
				topTransactions: function(cb) {
					api("stats.getTopTransactions", token, params, cb);
				},
				serverErrors: function (cb) {
					api("stats.getServerErrorStats",token, params, cb);
				},
				metrics: function (cb) {
					api("stats.getMetrics", token, params, cb)
				},
				database: function (cb) {
					api("stats.getActionsCategoryStats", token, params, cb)
				}
			}, cb)
		},
		homeInfo:function (token, params1, cb) {
			api("assets.getProjects", token, {_t_age:"30d"}, safe.sure(cb, function (projects) {
				safe.forEach(projects, function (projectN, cb) {
					var params = {quant:1,filter:_.extend({_idp:projectN._id},params1.filter)}
					safe.parallel({
						views: function (cb) {
							api("stats.getPageViews",token, params, cb);
						},
						errors: function (cb) {
							api("stats.getPagesErrorStats",token, params, cb);
						},
						ajax: function (cb) {
							api("stats.getAjaxTimings",token,params, cb);
						},
						actions: function (cb) {
							api("stats.getActions", token, params, cb);
						},
						topAjax: function (cb) {
							api("stats.getAjaxStats", token, params, cb);
						},
						topPages: function (cb) {
							api("stats.getTopPages", token, params, cb);
						},
						topTransactions: function(cb) {
							api("stats.getTopTransactions", token, params, cb);
						},
						serverErrors: function (cb) {
							api("stats.getServerErrorStats",token, params, cb);
						},
						metrics: function (cb) {
							api("stats.getMetrics", token, params, cb)
						},
						database: function (cb) {
							api("stats.getActionsCategoryStats", token, params, cb)
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
