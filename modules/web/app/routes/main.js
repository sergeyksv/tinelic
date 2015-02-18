define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		index:function (req, res, cb) {
			var token = req.cookies.token || "public"
			safe.parallel({
				view:function (cb) {
					requirejs(["views/index_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data: function (cb) {

					api("assets.getProjects",token, {_t_age:"30d"}, safe.sure(cb, function (project) {
						var quant = 1; var period = 15;
						var dtend = new Date();
						var dtstart = new Date(dtend.valueOf() - period * 60 * 1000);
						safe.forEach(project, function (n, cb) {
							api("collect.getPageViews", token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: n._id,
									_dtstart: dtstart,
									_dtend: dtend
								}
							}, safe.sure(cb, function (v) {
								var vall = null; var vale = null; var valr = null;
								if (v.length) {
									vall = vale = valr = 0;
									_.each(v, function (v) {
										valr+=v.value?v.value.r:0;
										vall+=v.value?(v.value.tt/1000):0;
										vale+=100*(v.value?(1.0*v.value.e/v.value.r):0);
									})

									vall=(vall/period).toFixed(2);
									vale=(vale/period).toFixed(2);
									valr=(valr/period).toFixed(2);
								}

								cb(null,_.extend(n, {views: valr, errors: vale, etu: vall}))
							}))
						}, safe.sure(cb, function() {
							cb(null, project)
						}))
					}))
				}
			}, safe.sure(cb, function (r) {
				res.renderX({
					route:req.route.path,
					view:r.view,
					data:{
						projects:r.data,
						title:"Tinelic - Home"
					}})
			}))
		},
		event:function (req, res, next) {
			var token = req.cookies.token || "public"
			safe.parallel({
				view:function (cb) {
					requirejs(["views/event_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				event:function (cb) {
					api("collect.getEvent",token, {_t_age:"30d",_id:req.params.id}, cb)
				},
				info:function (cb) {
					api("collect.getEventInfo",token, {_t_age:"10m",filter:{_id:req.params.id}}, cb)
				}
			}, safe.sure( next, function (r) {
				res.renderX({view:r.view,route:req.route.path,data:{event:r.event,info:r.info,title:"Event "+r.event.message}})
			}))
		},
		page:function (req, res, cb) {
			requirejs(["views/page_view"], safe.trap(cb, function (view) {
				res.renderX({view:view,route:req.route.path,data:{title:"Page Page"}})
			}), cb);
		},
		signup:function (req, res, cb) {
			requirejs(["views/signup_view"], safe.trap(cb, function (view) {
				res.renderX({view:view,route:req.route.path,data:{title:"Sign UP"}})
			}), cb);
		},
		users:function (req, res, cb) {
			var token = req.cookies.token || "public"
			safe.parallel({
				view: function (cb) {
					requirejs(["views/users_view"], function (view) {
						safe.back(cb, null, view)
					}, cb)
				},
				users: function (cb) {
					api("users.getUsers", token, {}, cb)
				}
			},safe.sure(cb, function(r) {
				res.renderX({view: r.view, route:req.route.path, data: {title: "Manage users", users: r.users}})

			}))
		},
		teams:function (req, res, cb) {
			var token = req.cookies.token || "public"
			safe.parallel({
				view: function (cb) {
					requirejs(["views/teams_view"], function (view) {
						safe.back(cb, null, view)
					}, cb)
				},
				teams: function (cb) {
					api("teams.getTeams", token, {}, cb)
				},
				proj: function(cb) {
					api("assets.getProjects", token, {}, cb)
				},
				users: function(cb) {
					api("users.getUsers", token, {}, cb)
				}
			},safe.sure(cb, function(r) {
					_.forEach(r.teams, function(teams) {
						if (teams.projects) {
							_.forEach(teams.projects, function (_idp) {
								_.forEach(r.proj,function(pr) {
									if (_idp._idp == pr._id) {
										_idp.name = pr.name
									}
								})
							})
						}
						if (teams.users) {
							_.forEach(teams.users, function(_idu) {
								_.forEach(r.users, function(usr) {
									if (_idu._idu == usr._id) {
										_idu.firstname = usr.firstname
										_idu.lastname = usr.lastname
									}
								})
							})
						}
					})
				res.renderX({view: r.view, route:req.route.path, data: {
					title: "Manage teams",
					teams: r.teams,
					proj: r.proj,
					usr: r.users
				}})
			}))
		},
		project:function (req, res, cb) {
			var token = req.cookies.token || "public"
			var str = req.query._str || req.cookies.str || '1d';
			var quant = 10;
			var range = 60 * 60 * 1000;

			// transcode range paramater into seconds
			var match = str.match(/(\d+)(.)/);
			var units = {
				h:60 * 60 * 1000,
				d:24 * 60 * 60 * 1000,
				w:7 * 24 * 60 * 60 * 1000
			}
			if (match.length==3 && units[match[2]])
				range = match[1]*units[match[2]];

			var dtstart = new Date(Date.parse(Date()) - range);
			var dtend = Date();

			safe.parallel({
				view:function (cb) {
					requirejs(["views/project/project_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data:function (cb) {
					api("assets.getProject",token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
						safe.parallel({
							views: function (cb) {
								api("collect.getPageViews",token,{_t_age:quant+"m",quant:quant,filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							},
							errors: function (cb) {
								api("collect.getErrorStats",token,{_t_age:quant+"m",filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							},
							ajax: function (cb) {
								api("collect.getAjaxStats",token,{_t_age:quant+"m",quant:quant,filter:{
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
				res.renderX({view:r.view,route:req.route.path,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name})})
			}))
		}
	}
})
