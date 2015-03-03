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
		}
	}
})
