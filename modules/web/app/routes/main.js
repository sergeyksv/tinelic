define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		index:function (req, res, next) {
			api("assets.getProjects","public", {}, safe.sure( next, function (projects) {
				res.render({view:'index_view',data:{projects:projects,title:"Tinelic - Home"}})
			}))
		},
		event:function (req, res, next) {
			safe.parallel({
				event:function (cb) {
					api("collect.getEvent","public", {_id:req.params.id}, cb)
				},
				info:function (cb) {
					api("collect.getEventInfo","public", {filter:{_id:req.params.id}}, cb)
				}
			}, safe.sure( next, function (r) {
				res.render({view:'event_view',data:{event:r.event,info:r.info,title:"Event "+r.event.message}})
			}))
		},
		page:function (req, res, next) {
			res.render({view:'page_view',data:{title:"Page Page"}})
		},
		project:function (req, res, cb) {
			var quant = 10;
			api("assets.getProject","public", {slug:req.params.slug}, safe.sure( cb, function (project) {
				safe.parallel({
					views: function (cb) {
						api("collect.getPageViews","public",{quant:quant,filter:{_idp:project._id}}, cb);
					},
					errors: function (cb) {
						api("collect.getErrorStats","public",{quant:quant,filter:{_idp:project._id}}, cb);
					}
				}, safe.sure(cb, function (r) {
					res.render({view:'project/project_view',data:_.extend(r,{quant:quant,project:project,title:"Project "+project.name})})
				}))
			}))
		},
	}
})
