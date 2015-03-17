define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		errorInfo:function (token, params, cb) {
			safe.parallel({
				event:function (cb) {
					api("stats.getEvent",token, _.extend({_t_age:"30d"},params), cb)
				},
				info:function (cb) {
					api("stats.getEventInfo",token, _.extend({_t_age:"10m"},params), cb)
				}
			}, cb)
		},
		projectInfo:function (token, params, cb) {
			safe.parallel({
				views: function (cb) {
					api("stats.getPageViews",token, params, cb);
				},
				errors: function (cb) {
					api("stats.getErrorStats",token, params, cb);
				},
				ajax: function (cb) {
					api("stats.getAjaxStats",token,params, cb);
				},
				actions: function (cb) {
					api("stats.getActions", token, params, cb);
				},
				topAjax: function (cb) {
					api("stats.getTopAjax", token, params, cb);
				},
				topPages: function (cb) {
					api("stats.getTopPages", token, params, cb);
				},
				topTransactions: function(cb) {
					api("stats.getTopTransactions", token, params, cb);
				}
			}, cb)
		}
	}
})
