define(["tinybone/backadapter", "safe","lodash","feed/mainres"], function (api,safe,_,feed) {
	return {
		index:function (req, res, cb) {
			safe.parallel({
				view:function (cb) {
					requirejs(["views/index_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data: function (cb) {

					api("assets.getProjects",res.locals.token, {_t_age:"30d"}, safe.sure(cb, function (project) {
						var quant = 1; var period = 15;
						var dtend = new Date();
						var dtstart = new Date(dtend.valueOf() - period * 60 * 1000);
						safe.forEach(project, function (n, cb) {
							api("collect.getPageViews", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: n._id,
									_dt: {$gt: dtstart,$lte:dtend}
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
				},
				teams: function (cb) {
					api("assets.getTeams", res.locals.token, {}, cb)
				}
			}, safe.sure(cb, function (r) {
				_.forEach(r.teams, function(team) {
					var projects = {};
					_.forEach(r.data, function(proj) {
						projects[proj._id] = proj
					})
					_.forEach(team.projects, function(proj) {
						proj._t_proj = projects[proj._idp]
					})
				})
				res.renderX({
					view:r.view,
					data:{
						title:"Tinelic - Home",
						teams: r.teams
					}})
			}))
		},
		event:function (req, res, next) {
			var st = req.params.st
			safe.parallel({
				view:function (cb) {
					requirejs(["views/event_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				res:function (cb) {
					feed.errorInfo(res.locals.token, {_id:req.params.id}, cb)
				}
			}, safe.sure( next, function (r) {
				res.renderX({view:r.view,data:_.extend(r.res,{title:"Event "+r.res.event.message, st: st})})
			}))
		},
		page:function (req, res, cb) {
			requirejs(["views/page_view"], safe.trap(cb, function (view) {
				res.renderX({view:view,data:{title:"Page Page"}})
			}), cb);
		},
		users:function (req, res, cb) {
			safe.parallel({
				view: function (cb) {
					requirejs(["views/users_view"], function (view) {
						safe.back(cb, null, view)
					}, cb)
				},
				users: function (cb) {
					api("users.getUsers", res.locals.token, {}, cb)
				}
			},safe.sure(cb, function(r) {
				res.renderX({view: r.view, data: {title: "Manage users", users: r.users}})

			}))
		},
		teams:function (req, res, cb) {
			safe.parallel({
				view: function (cb) {
					requirejs(["views/teams_view"], function (view) {
						safe.back(cb, null, view)
					}, cb)
				},
				teams: function (cb) {
					api("assets.getTeams", res.locals.token, {}, cb)
				},
				proj: function(cb) {
					api("assets.getProjects", res.locals.token, {}, cb)
				},
				users: function(cb) {
					api("users.getUsers", res.locals.token, {}, cb)
				}
			}, safe.sure(cb,function(r) {
				var rules = [{action:"team_new"}]
				_.each(r.teams, function (team) {
					rules.push({action:"team_edit",_id:team._id})
					_.each(team.projects, function (project) {
						rules.push({action:"project_edit",_id:project._idp})
					})
				})
				api("obac.getPermissions", res.locals.token, {rules:rules}, safe.sure(cb, function (answers) {
					console.log(answers);
					_.forEach(r.teams, function(teams) {
						if (teams.projects) {
							var projects = {};
							_.forEach(r.proj, function(proj) {
								projects[proj._id] = proj
							})
							_.forEach(teams.projects, function (proj) {
								proj._t_project = projects[proj._idp]
							})
						}
						if (teams.users) {
							var users = {};
							_.forEach(r.users, function(usr) {
								users[usr._id] = usr;
							})
							_.forEach(teams.users, function(user) {
								user.firstname = users[user._idu].firstname;
								user.lastname = users[user._idu].lastname;
							})
						}
					})
					res.renderX({view: r.view, data: {
						title: "Manage teams",
						teams: r.teams,
						proj: r.proj,
						usr: r.users,
						obac: answers
					}})
				}))
			}))
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
					api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
						api("web.getFeed",res.locals.token, {_t_age:quant+"m", feed:"mainres.projectInfo", params:{quant:quant,filter:{
							_idp:project._id,
							_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
						}}}, safe.sure(cb, function (r) {
							 cb(null,_.extend(r, {project:project}))
						}))
					}))
				}
			}, safe.sure(cb, function (r) {
				var views = {}; // total | server | browser | transaction | page | ajax
				var valtt; var vale; var valr; var period;
				if (r.data.views.length != 0) {
					valtt = vale = valr = 0;
					period = r.data.views.length;
					_.forEach(r.data.views, function (v) {
						valr+=v.value?v.value.r:0;
						valtt+=v.value?(v.value.tt/1000):0;
						vale+=v.value?v.value.e:0;
					})

					valtt=(valtt/period).toFixed(2);
					vale=(vale/period).toFixed(2);
					valr=(valr/period).toFixed(2);
					views.total = {rpm: valr, errorpage: vale, etupage: valtt}

				}
				if (r.data.actions.length != 0) {
					valtt = vale = valr = 0;
					period = r.data.actions.length;
					_.forEach(r.data.actions, function (v) {
						valr+=v.value?v.value.r:0;
						valtt+=v.value?(v.value.tt):0;
					})

					valtt=(valtt/period).toFixed(2);
					valr=(valr/period).toFixed(2);
					_.extend(views.total,{rsm: valr, ttserver: valtt});

				}
				if (r.data.ajax.length != 0) {
					valtt = vale = valr = 0;
					period = r.data.ajax.length;
					_.forEach(r.data.ajax, function (v) {
						valr+=v.value?v.value.r:0;
						valtt+=v.value?(v.value.tt/1000):0;
						vale+=v.value?v.value.e:0;
					})

					valtt=(valtt/period).toFixed(2);
					vale=(vale/period).toFixed(2);
					valr=(valr/period).toFixed(2);
					_.extend(views.total,{ram: valr, errorajax: vale, etuajax: valtt})

				}
				if (r.data.errors.length != 0) {
					views.browser = {};

					var data = _.take(r.data.errors, 10)
					views.browser.err = data;
				}
				if (r.data.topAjax.length != 0) {
					views.topa = {}
					views.topa.a = _.take(_.sortBy(r.data.topAjax, function(r) {
						return r.value.tt
					}).reverse(),10)
					var progress = null;
					_.forEach(views.topa.a,function(r) {
						if (!progress) {
							progress = r.value.tt
						}
						else {
							progress += r.value.tt
						}
					})
					_.forEach(views.topa.a, function(r) {
						r.value.progress = (r.value.tt/progress)*100
						var split = r._id.split('/')
						if (split.length > 3)
							r._id = '../'+split[split.length-1];
					})
				}
				if (r.data.topPages.length != 0) {
					views.topp = {}
					views.topp.p = _.take(_.sortBy(r.data.topPages,function(r) {
						return r.value.tt
					}).reverse(),10)
					var progress = null;
					_.forEach(views.topp.p,function(r) {
						if (!progress) {
							progress = r.value.tt
						}
						else {
							progress += r.value.tt
						}
					})
					_.forEach(views.topp.p, function(r) {
						r.value.progress = (r.value.tt/progress)*100
						r.value.tta = (r.value.tta/1000).toFixed(2)
						var split = r._id.split('/')
						if (split.length > 3)
							r._id = '../'+split[split.length-1]
					})
				}
				if (r.data.topTransactions.length != 0) {
					views.transactions = {}
					views.transactions.top = _.take(_.sortBy(r.data.topTransactions, function(r) {
						return r.value.tt
					}).reverse(),10)
					var progress = null;
					_.forEach(views.transactions.top,function(r) {
						if (!progress) {
							progress = r.value.tt
						}
						else {
							progress += r.value.tt
						}
					})
					_.forEach(views.transactions.top, function(r) {
						r.value.progress = (r.value.tt/progress)*100
						var split = r._id.split('/')
						if (split.length > 3)
							r._id = '../'+split[split.length - 2]+'/'+split[split.length-1]
					})
				}

				res.renderX({view:r.view,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name, stats: views})})
			}))
		},
		ajax_rpm:function (req, res, cb) {
			var st = req.params.stats;
			var quant = 10;
			api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
			safe.parallel({
				view: function (cb) {
					requirejs(["views/ajax_rpm_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				rpm: function (cb) {
					api("collect.getAjaxRpm","public",{_t_age:quant+"m",quant:quant,filter:{
						_idp:project._id,
						_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
					}}, cb);
				}
			}, safe.sure(cb, function(r){
				var filter = {
						_t_age: quant + "m", quant: quant,
						filter: {
							_idp: project._id,
							_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
						}
					}
				r.rpm =_.sortBy(r.rpm, function(v){
					if (st == "rpm")
						return -1*v.value.r;
					if (st == "mtc")
						return -1* v.value.tt;
					if (st == "sar")
						return -1* v.value.tta;
					if (st == "wa")
						return 1* v.value.apdex;
				})
				var sum=0.0;
				_.each(r.rpm, function(r){
					if (st == "rpm")
						sum+=r.value.r
					if (st == "mtc")
						sum += r.value.tt
					if (st == "sar")
						sum += r.value.tta
					if (st == "wa") {
						sum = 1;
						(r.value.apdex < sum) ?	(sum = r.value.apdex) : null
					}
				})
				var percent = sum/100;
				_.each(r.rpm, function (r) {
					if (st == "rpm") {
						r.value.bar = Math.round(r.value.r/percent);
						r.value.r = r.value.r.toFixed(2)
					}
					if (st == "mtc") {
						r.value.bar = Math.round(r.value.tt/percent);
						r.value.tt = r.value.tt.toFixed(1);
					}
					if (st == "sar") {
						r.value.bar = Math.round(r.value.tta/percent);
					}
					if (st == "wa") {
						r.value.bar = Math.round(r.value.apdex/percent);
						r.value.apdex = r.value.apdex.toFixed(2);
					}
				})
				 res.renderX({view:r.view,data:{rpm:r.rpm, project:project, st: st, fr: filter, title:"Ajax"}})
				})
			)
		    }))
		},
		application:function (req, res, cb) {
			var st = req.params.stats
			var quant = 10;
			api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/application_view"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("collect.getTopTransactions", "public", {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								}
							}, cb)
						}
					}, safe.sure(cb, function(r){
						var filter = {
							_t_age: quant + "m", quant: quant,
							filter: {
								_idp: project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}
						}
						r.data =_.sortBy(r.data, function(v){
							if (st == "rpm")
								return -1*v.value.r;
							if (st == "mtc")
								return -1* v.value.tt;
							if (st == "sar")
								return -1* v.value.tta;
							if (st == "wa")
								return 1* v.value.apdex;
						})

						var sum=0;
						_.each(r.data, function(r){
							if (st == "rpm")
								sum+=r.value.r
							if (st == "mtc")
								sum += r.value.tt
							if (st == "sar")
								sum += r.value.tta
							if (st == "wa") {
								sum = 1;
								(r.value.apdex < sum) ?	(sum = r.value.apdex) : null
							}
						})
						var percent = sum/100;
						_.each(r.data, function (r) {
							if (st == "rpm") {
								r.value.bar = Math.round(r.value.r/percent);
								r.value.r = r.value.r.toFixed(2)
							}
							if (st == "mtc") {
								r.value.bar = Math.round(r.value.tt/percent);
								r.value.tt = r.value.tt.toFixed(1);
							}
							if (st == "sar") {
								r.value.bar = Math.round(r.value.tta/percent);
							}
							if (st == "wa") {
								r.value.bar = Math.round(r.value.apdex/percent);
								r.value.apdex = r.value.apdex.toFixed(2);
							}
						})

						res.renderX({view:r.view,data:{data:r.data, title:"Application", st: st, fr: filter}})
					})
				)
			}))
		},
		pages:function (req, res, cb) {
			var st = req.params.stats
			var quant = 10;
			api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/pages_view"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("collect.getTopPages", "public", {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								}
							}, cb)
						}
					}, safe.sure(cb, function(r){
						var filter = {
							_t_age: quant + "m", quant: quant,
							filter: {
								_idp: project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}
						}
						r.data =_.sortBy(r.data, function(v){
							if (st == "rpm")
								return -1*v.value.r;
							if (st == "mtc")
								return -1* v.value.tt;
							if (st == "sar")
								return -1* v.value.tta;
							if (st == "wa")
								return 1* v.value.apdex;
						})

						var sum=0;
						_.each(r.data, function(r){
							if (st == "rpm")
								sum+=r.value.r
							if (st == "mtc")
								sum += r.value.tt
							if (st == "sar")
								sum += r.value.tta
							if (st == "wa") {
								sum = 1;
								(r.value.apdex < sum) ?	(sum = r.value.apdex) : null
							}
						})
						var percent = sum/100;
						_.each(r.data, function (r) {
							if (st == "rpm") {
								r.value.bar = Math.round(r.value.r/percent);
								r.value.r = r.value.r.toFixed(2)
							}
							if (st == "mtc") {
								r.value.bar = Math.round(r.value.tt/percent);
								r.value.tt = r.value.tt.toFixed(1);
							}
							if (st == "sar") {
								r.value.bar = Math.round(r.value.tta/percent);
								r.value.tta = (r.value.tta/1000).toFixed(2)
							}
							if (st == "wa") {
								r.value.bar = Math.round(r.value.apdex/percent);
								r.value.apdex = r.value.apdex.toFixed(2);
							}
						})
						res.renderX({view:r.view,data:{data:r.data, title:"Pages", st: st, fr: filter}})
					})
				)
			}))
		},
		errors:function (req, res, cb) {
			// we want to server on folder style url
			if (req.path.substr(-1) != "/" && !req.params.id)
				return res.redirect(req.baseUrl+req.path+"/");
			var st = req.params.sort
			var quant = 10;
			api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/err_view"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("collect.getErrorStats","public",{_t_age:quant+"m",filter:{
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}}, cb);
						},
						event: function (cb) {
							feed.errorInfo(res.locals.token, {_id:req.params.id}, cb)
						}
					}, safe.sure(cb, function(r){
						r.event.headless = true;
						var data = []
						if (st == 'terr') {
							data = r.data
						}
						else {
							_.forEach(r.data, function (r) {
								if (r.error.request.headers) {
									if (r.error.request.headers['User-Agent'] == req.headers['user-agent']) {
										data.push(r)
									}
								}
							})
							if (data.length == 0) {
								data.push({error: {message: "Not errors on this client"}})
							}
						}
						var sum = 0.0
						_.forEach(data, function(r) {
							sum += r.stats.epm
						})
						var percent = sum/100
						_.forEach(data, function(r) {
							r.bar = r.stats.epm/percent
						})
						res.renderX({view:r.view,data:{data:data,event:r.event, title:"Errors",st: st}})
					})
				)
			}))
		},
		database:function (req, res, cb) {
			var st = req.params.stats
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
			api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/database_view"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("collect.asBreakDown", "public", {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: dtstart, $lte: dtend}
								}
							}, cb)
						}
					}, safe.sure(cb, function(r){
						var filter = {
							_t_age: quant + "m", quant: quant,
							filter: {
								_idp: project._id,
								_dt: {$gt: dtstart, $lte: dtend}
							}
						}
						var data = {};
						_.forEach(r.data, function(r) {
							_.forEach(r.value,function(r) {
								if (r._s_name) {
									if (r._s_type == "Datastore/statement") {
										if (!data[r._s_name]) {
											data[r._s_name] = r
										}
										else {
											data[r._s_name]._i_cnt += r._i_cnt;
											data[r._s_name]._i_tt += r._i_tt;
										}
									}
								}
							})
						})
						var arr = [];
						var sum = 0.0;
						_.forEach(data, function(r,v) {
							if (st == 'req')
								sum += r._i_cnt
							if (st == 'mtc')
								sum += r._i_tt
							arr.push({name:v, r: r._i_cnt, tt: r._i_tt, avg: r._i_tt/ r._i_cnt})
							if (st == 'sar')
								sum += (r._i_tt/ r._i_cnt)
						})
						var procent = sum/100
						_.forEach(arr, function(r) {
							if (st == 'req')
								r.bar = r.r/procent
							if (st == 'mtc')
								r.bar = r.tt/procent
							if (st == 'sar')
								r.bar = r.avg/procent
						})
						arr = _.sortBy(arr, function(r) {
							r.avg = parseInt(r.avg)
							if (st == 'req')
								return r.r*-1
							if (st == 'mtc')
								return r.tt*-1
							if (st == 'sar')
								return r.avg*-1
						})
						res.renderX({view:r.view,route:req.route.path,data:{data:arr, title:"Database/Statements", st: st, fr: filter}})
					})
				)
			}))
		}
	}
})
