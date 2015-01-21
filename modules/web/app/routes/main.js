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
					api("assets.getProjects","public", {_t_age:"30d"}, cb)
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
					api("collect.getEvent","public", {_t_age:"30d",_id:req.params.id}, cb)
				},
				info:function (cb) {
					api("collect.getEventInfo","public", {_t_age:"10m",filter:{_id:req.params.id}}, cb)
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
			var str = req.query._str || req.cookies.str || '1d';
			var quant = 10;
			var range;

			if (str == '1h') {
				range = 60 * 60 * 1000;
			}
			if (str == '6h') {
				range = 6 * 60 * 60 * 1000;
			}
			if (str == '12h') {
				range = 12 * 60 * 60 * 1000;
			}
			if (str == '1d') {
				range = 24 * 60 * 60 * 1000;
			}
			if (str == '3d') {
				range = 3 * 24 * 60 * 60 * 1000;
			}
			if (str == '1w') {
				range = 7 * 24 * 60 * 60 * 1000;
			}

			var dtstart = new Date(Date.parse(Date()) - range);
			var dtend = Date();

			safe.parallel({
				view:function (cb) {
					requirejs(["views/project/project_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data:function (cb) {
					api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
						safe.parallel({
							views: function (cb) {
								api("collect.getPageViews","public",{_t_age:quant+"m",quant:quant,filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							},
							errors: function (cb) {
								api("collect.getErrorStats","public",{_t_age:quant+"m",filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							}
						}, safe.sure(cb, function (r) {
							 cb(null,_.extend(r, {project:project, filter: str}))
						}))
					}))
				}
			}, safe.sure(cb, function (r) {
				res.render({view:r.view,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name})})
			}))
		}
	}
})
