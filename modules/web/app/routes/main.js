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
					var quant = 1; var period = 15;
					var dtend = new Date();
					var dtstart = new Date(dtend.valueOf() - period * 60 * 1000);
					api("web.getFeed",res.locals.token, {_t_age:quant+"m", feed:"mainres.homeInfo", params:{quant:quant,filter:{
						_dt: {$gt: dtstart,$lte:dtend}
						}}}, safe.sure(cb, function (r) {
						r.forEach(function (r){
							var period;
							var errAck = r.result.errAck
							var Apdex = {}; var Server = {}; var Client = {}; var Ajax = {};
							Client.r = Client.e = Client.etu = 0;
							Apdex.client = Apdex.server = Apdex.ajax = 0;
							Ajax.r = Ajax.e = Ajax.etu = 0;
							Server.r = Server.e = Server.etu = Server.proc = Server.mem = 0;
							if (r.result.views.length != 0) {
								period = r.result.views.length;
								_.each(r.result.views, function (v) {
									Client.r+=v.value?v.value.r:0;
									Client.etu+=v.value?(v.value.tt/1000):0;
									Client.e+=100*(v.value?(1.0*v.value.e/v.value.r):0);
									Apdex.client+=v.value.apdex?v.value.apdex:0;
								})

								Client.r=(Client.r/period);
								Client.etu=(Client.etu/period);
								Client.e=(Client.e/period);
								Apdex.client=(Apdex.client/period);
							}
							if (r.result.ajax.length != 0) {
								period = r.result.ajax.length;
								_.forEach(r.result.ajax, function (v) {
									Ajax.r+=v.value?v.value.r:0;
									Ajax.etu+=v.value?(v.value.tt/1000):0;
									Ajax.e+=100*(v.value?(1.0*v.value.e/v.value.r):0);
									Apdex.ajax+=v.value.apdex?v.value.apdex:0;
								})

								Ajax.etu=(Ajax.etu/period);
								Ajax.e=(Ajax.e/period);
								Ajax.r=(Ajax.r/period);
								Apdex.ajax=(Apdex.ajax/period);
							}
							var trans = 0;
							if (r.result.actions.length != 0) {
								period = r.result.actions.length;
								_.forEach(r.result.actions, function (v) {
									trans+=v.value?v.value.r:0;
									Server.r+=v.value?v.value.r:0;
									Server.etu+=v.value?(v.value.tt/1000):0;
									Apdex.server+=v.value.apdex?v.value.apdex:0;
								})

								Server.etu=(Server.etu/period);
								Server.r=(Server.r/period);
								Apdex.server=(Apdex.server/period);
							}
							var absSE = 0;
							if (r.result.serverErrors.length != 0) {
								period = r.result.serverErrors.length;
								_.forEach(r.result.serverErrors, function (v) {
									absSE+=v.stats?v.stats.c:0
								})
								Server.e = ((100*(absSE?(1.0*absSE/trans):0))/period);
							}
							if (r.result.metrics) {
								Server.proc = r.result.metrics.proc;
								Server.mem = r.result.metrics.mem;
							}
							_.extend(r, {apdex: Apdex, server: Server, client: Client, ajax: Ajax, errAck: errAck})
						})
						cb(null, r)
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
					requirejs(["views/client-errors/event_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				res:function (cb) {
					feed.errorInfo(res.locals.token, {filter:{_id:req.params.id}}, cb)
				}
			}, safe.sure( next, function (r) {
				res.renderX({view:r.view,data:_.extend(r.res,{title:"Event "+r.res.event.message, st: st})})
			}))
		},
		serror:function (req, res, next) {
			var st = req.params.st
			safe.parallel({
				view:function (cb) {
					requirejs(["views/server-errors/server-event_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				res:function (cb) {
					feed.serverErrorInfo(res.locals.token, {filter:{_id:req.params.id}}, cb)
				}
			}, safe.sure( next, function (r) {
				res.renderX({view:r.view,data:_.extend(r.res,{title:"Server error"+'-'+r.res.event.exception._s_value, st: st})})
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
						var projects=[]; projects[0]=project;
						var dt = res.locals.dtstart
						var dta = project._dtActionsErrAck || dt;
						var dtp = project._dtPagesErrAck || dt;
						api("web.getFeed",res.locals.token, {_t_age:quant+"m", feed:"mainres.projectInfo", params:{quant:quant,
							filter:{
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							},
							_dtActionsErrAck: (dta <= dt)?dt:dta,
							_dtPagesErrAck: (dtp <= dt)?dt:dtp
						}}, safe.sure(cb, function (r) {
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
						valtt+=v.value?(v.value.tt/1000):0;
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
					var total = 0; var session = 0; var page = 0
					_.forEach(r.data.errors, function(r){
						total += r.stats.count;
						session += r.stats.session;
						page += r.stats.pages;
					})
					var data = _.take(r.data.errors, 10)
					_.extend(views.browser,{err: data, total: total, session: session, page: page})
				}
				if (r.data.serverErrors.length != 0) {
					views.serverErr = {};
					var total = 0;
					_.forEach(r.data.serverErrors, function(r) {
						total += r.stats.c
					})
					var data = _.take(r.data.serverErrors, 10)
					_.extend(views.serverErr,{sErr:data,total:total})
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
						r._id = r._id.replace(/(^https:\/\/www.)?(^http:\/\/www.)?/,"")
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
					})
				}
				if (r.data.topTransactions.length != 0) {
					views.transactions = {}
					views.transactions.top = r.data.topTransactions
				}

				if (r.data.metrics) {
					if (!views.total)
						views.total = {}

					views.total.metrics = r.data.metrics
				}

				if (r.data.views.length || r.data.ajax.length || r.data.actions.length)
					var graphOn = {}

				if (r.data.views.length)
					graphOn.browser = 1

				if (r.data.ajax.length)
					graphOn.ajax = 1

				if (r.data.actions.length)
					graphOn.server = 1

				if (r.data.database.length != 0) {
					views.database = {}
					views.database.db = r.data.database
				}

				res.renderX({view:r.view,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name, stats: views, graphOn: graphOn})})
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
					api("stats.getAjaxRpm","public",{_t_age:quant+"m",quant:quant,filter:{
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
						return -1* (v.value.tt*v.value.r);
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
						sum += r.value.tt*r.value.r
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
					}
					if (st == "mtc") {
						r.value.bar = Math.round((r.value.tt*r.value.r)/percent);
						r.value.tt = Number(r.value.tt/1000)
						r.value.r = quant*r.value.r
					}
					if (st == "sar") {
						r.value.bar = Math.round(r.value.tta/percent);
					}
					if (st == "wa") {
						r.value.bar = Math.round(r.value.apdex/percent);
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
							api("stats.getTopTransactions", "public", {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								},
								st: st
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
							api("stats.getTopPages", "public", {
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
								return -1* (v.value.tta*v.value.r);
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
								sum += r.value.tta*r.value.r
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
							}
							if (st == "mtc") {
								r.value.bar = Math.round((r.value.tta*r.value.r)/percent);
								r.value.r = quant*r.value.r
								r.value.tta = r.value.tta/1000
							}
							if (st == "sar") {
								r.value.bar = Math.round(r.value.tta/percent);
								r.value.tta = r.value.tta/1000
							}
							if (st == "wa") {
								r.value.bar = Math.round(r.value.apdex/percent);
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
							requirejs(["views/client-errors/err_view"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getPagesErrorStats","public",{st:st,_t_age:quant+"m",filter:{
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}}, cb);
						},
						event: function (cb) {
							feed.errorInfo(res.locals.token, {filter:{_id:req.params.id}}, cb)
						},
						rpm: function (cb){
								api("stats.getPagesErrorTiming", "public", {_t_age:quant+"m",quant:quant, filter:{
									_idp:project._id, _id:req.params.id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								}}, cb)
						}
					}, safe.sure(cb, function(r){
						var filter = {
							_t_age: quant + "m", quant: quant,
							filter: {
								_idp: project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}
						}
						var total = 0; var session = 0; var page = 0;
						_.forEach(r.data, function(r) {
							total += r.stats.count;
							session += r.stats.session;
							page += r.stats.pages;
						})
						r.event.headless = true;
						res.renderX({view:r.view,data:{data: r.data,event:r.event, rpm:r.rpm, title:"Errors",st: st, fr: filter, project: project, total: total, session: session, page:page}})
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
							api("stats.getActionsCategoryStats", "public", {
								_t_age: quant + "m",
								quant: quant,
								filter: {
									_idp: project._id,
									_dt: {$gt: dtstart, $lte: dtend}
								},
								st: st
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
						res.renderX({view:r.view,route:req.route.path,data:{data: r.data, title:"Database/Statements", st: st, fr: filter}})
					})
				)
			}))
		},
		server_errors: function(req,res,cb) {
			// we want to server on folder style url
			if (req.path.substr(-1) != "/" && !req.params.id)
				return res.redirect(req.baseUrl+req.path+"/");
			var st = req.params.sort
			var quant = 10;
			api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/server-errors/server-err_view"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getServerErrorStats","public",{_t_age:quant+"m",filter:{
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}}, cb);
						},
						event: function (cb) {
							feed.serverErrorInfo(res.locals.token, {filter:{_id:req.params.id}}, cb)
						},
						rpm: function (cb){
								api("stats.getServerErrorRpm", "public", {_t_age:quant+"m",quant:quant, filter:{
									_idp:project._id, _id:req.params.id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								}}, cb)
						}
					}, safe.sure(cb, function(r){
						var filter = {
							_t_age: quant + "m", quant: quant,
							filter: {
								_idp: project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}
						}
						r.event.headless = true;
						var data = []
						if (st == 'terr') {
							data = r.data
						}
						if (data.length == 0) {
							data.push({error: {_s_message: "Not errors on this client"}})
						}
						var sum = 0.0
						_.forEach(data, function(r) {
							sum += r.stats.c
						})
						var percent = sum/100
						_.forEach(data, function(r) {
							r.bar = r.stats.c/percent
						})
						res.renderX({view:r.view,data:{data:data,event:r.event,rpm:r.rpm, title:"Server-errors",st: st, fr: filter, project:project, total: sum}})
					})
				)
			}))
		}
	}
})
