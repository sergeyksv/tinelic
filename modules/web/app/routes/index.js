define(["tinybone/backadapter", "safe"], function (api,safe) { return function (req, res, next) {
	api("sentry.getEvents","public", {}, safe.sure( next, function (events) {
		res.render({view:'index_view',data:{events:events,text:"Index Page"}})
	}))
}})
