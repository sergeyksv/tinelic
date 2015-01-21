define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		index:function (req, res, next) {
			api("assets.getProjects","public", {}, safe.sure( next, function (projects) {
				res.render({view:'index_view',data:{projects:projects,title:"Tinelic - Home"}})
			}))
		},
		event:function (req, res, next) {
			api("collect.getEvent","public", {_id:req.params.id}, safe.sure( next, function (event) {
				res.render({view:'event_view',data:{event:event,title:"Event "+event.message}})
			}))
		},
		page:function (req, res, next) {
			res.render({view:'page_view',data:{title:"Page Page"}})
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

			api("assets.getProject","public", {slug:req.params.slug}, safe.sure( cb, function (project) {
				safe.parallel({
					views: function (cb) {
						api("collect.getPageViews","public",{quant:quant,filter:{_idp:project._id}}, cb);
					},
					errors: function (cb) {
						api("collect.getErrorStats","public",{quant:quant,filter:{
							_idp:project._id,
							_dtstart: dtstart,
							_dtend: dtend
						}}, cb);
					}
				}, safe.sure(cb, function (r) {
					res.render({view:'project/project_view',data:_.extend(r,{
						quant:quant,
						project:project,
						title:"Project "+project.name,
						filter: str})})
				}))
			}))
		}
	}
})
