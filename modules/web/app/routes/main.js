define(["tinybone/backadapter", "safe"], function (api,safe) {
	return {
		index:function (req, res, next) {
			api("assets.getProjects","public", {}, safe.sure( next, function (projects) {
				res.render({view:'index_view',data:{projects:projects,title:"Tinelic - Home"}})
			}))
		},
		event:function (req, res, next) {
			api("sentry.getEvent","public", {_id:req.params.id}, safe.sure( next, function (event) {
				res.render({view:'event_view',data:{event:event,title:"Event "+event.message}})
			}))
		},
		page:function (req, res, next) {
			res.render({view:'page_view',data:{title:"Page Page"}})
		},
		project:function (req, res, next) {
			api("assets.getProject","public", {slug:req.params.slug}, safe.sure( next, function (project) {
				api("sentry.getPageViews","public",{}, safe.sure( next, function (views) {
					res.render({view:'project/project_view',data:{views:views,project:project,title:"Project "+project.name}})
				}))
			}))
		},
	}
})
