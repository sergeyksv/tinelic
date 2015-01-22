define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		index:function (req, res, cb) {
			safe.parallel({
				view:function (cb) {
					requirejs(["views/index_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data: function (cb) {
					api("assets.getProjects","public", {}, cb)
				}
			}, safe.sure(cb, function (r) {
				res.render({view:r.view, data:{projects:r.data,title:"Tinelic - Home"}})
			}))
		},
		event:function (req, res, next) {
			safe.parallel({
				view:function (cb) {
					requirejs(["views/event_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				event:function (cb) {
					api("collect.getEvent","public", {_id:req.params.id}, cb)
				},
				info:function (cb) {
					api("collect.getEventInfo","public", {filter:{_id:req.params.id}}, cb)
				}
			}, safe.sure( next, function (r) {
				res.render({view:r.view,data:{event:r.event,info:r.info,title:"Event "+r.event.message}})
			}))
		},
		page:function (req, res, cb) {
			requirejs(["views/page_view"], function (view) {
				res.render({view:view,data:{title:"Page Page"}})
			}, cb);
		},
		project:function (req, res, cb) {
			var quant = 10;
			safe.parallel({
				view:function (cb) {
					requirejs(["views/project/project_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data:function (cb) {
					api("assets.getProject","public", {slug:req.params.slug}, safe.sure( cb, function (project) {
						safe.parallel({
							views: function (cb) {
								api("collect.getPageViews","public",{quant:quant,filter:{_idp:project._id}}, cb);
							},
							errors: function (cb) {
								api("collect.getErrorStats","public",{filter:{_idp:project._id}}, cb);
							}
						}, safe.sure(cb, function (r) {
							 cb(null,_.extend(r, {project:project}))
						}))
					}))
				}
			}, safe.sure(cb, function (r) {
				res.render({view:r.view,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name})})
			}))
		},
	}
})
