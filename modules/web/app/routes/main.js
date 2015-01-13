define(["tinybone/backadapter", "safe"], function (api,safe) {
	return {
		index:function (req, res, next) {
			api("sentry.getEvents","public", {}, safe.sure( next, function (events) {
				res.render({view:'index_view',data:{events:events,title:"Index Page"}})
			}))
		},
		event:function (req, res, next) {
			api("sentry.getEvent","public", {_id:req.params.id}, safe.sure( next, function (event) {
				res.render({view:'event_view',data:{event:event,title:"Event "+event.message}})
			}))
		},
		page:function (req, res, next) {
			res.render({view:'page_view',data:{title:"Page Page"}})
		}
	}
})
