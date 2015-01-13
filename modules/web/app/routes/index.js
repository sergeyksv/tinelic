define(["tinybone/backadapter", "safe"], function (api,safe) { return function (cb) {
	api("sentry.getEvents","public", {}, safe.sure( cb, function (events) {
		cb(null,{view:'index_view',data:{events:events,text:"Index Page"}})
	}))
}})
