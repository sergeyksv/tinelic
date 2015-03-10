define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		errorInfo:function (token, params, cb) {
			safe.parallel({
				event:function (cb) {
					api("collect.getEvent",token, _.extend({_t_age:"30d"},params), cb)
				},
				info:function (cb) {
					api("collect.getEventInfo",token, _.extend({_t_age:"10m"},params), cb)
				}
			}, cb)
		},
		projectInfo:function (token, params, cb) {
			safe.parallel({
				views: function (cb) {
					api("collect.getPageViews",token, params, cb);
				},
				errors: function (cb) {
					api("collect.getErrorStats",token, params, cb);
				},
				ajax: function (cb) {
					api("collect.getAjaxStats",token,params, cb);
				},
				actions: function (cb) {
					api("collect.getActions", token, params, cb);
				},
				topAjax: function (cb) {
					api("collect.getTopAjax", token, params, cb);
				},
				topPages: function (cb) {
					api("collect.getTopPages", token, params, cb);
				},
				topTransactions: function(cb) {
					api("collect.getTopTransactions", token, params, cb);
				}
			}, cb)
		}
	}
})
