/*jshint -W033 */
define(["require","tinybone/backadapter", "safe","lodash","feed/mainres","moment/moment"], function (require,api,safe,_,feed,moment) {
	return {
		index:function (req, res, cb) {
			require(["routes/index"],function (route) {
				route(req,res,cb);
			},cb)
		},
		project:function (req, res, cb) {
			require(["routes/project"],function (route) {
				route(req,res,cb);
			},cb)
		},
		users:function (req, res, cb) {
			safe.parallel({
				view: function (cb) {
					requirejs(["views/users/users"], function (view) {
						safe.back(cb, null, view)
					}, cb)
				},
				users: function (cb) {
					api("users.getUsers", res.locals.token, {}, cb)
				}
			},safe.sure(cb, function(r) {
				var rules = [{action:"user_new"}]
				_.each(r.users, function (user) {
					rules.push({action:"user_edit",_id:user._id})
				})
				api("obac.getPermissions", res.locals.token, {rules:rules}, safe.sure(cb, function (answers) {
					res.renderX({view: r.view, data: {title: "Manage users", users: r.users, obac: answers}})
				}))
			}))
		},
		teams:function (req, res, cb) {
			safe.parallel({
				view: function (cb) {
					requirejs(["views/teams/teams"], function (view) {
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
				var rules = [{action:"team_new"},{action:"project_new"}]
				_.each(r.teams, function (team) {
					rules.push({action:"team_edit",_id:team._id})
				})
				safe.parallel({
					answers: function(cb){
						api("obac.getPermissions", res.locals.token, {rules:rules}, cb)
					}
				},safe.sure(cb,function(result){
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
						obac: result.answers
					}})
				}))

			}))
		},
		ajax:function (req, res, cb) {
			var st = req.params.stats;
			var quant = res.locals.quant;

			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/ajax/ajax"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						rpm: function (cb) {
							api("stats.getAjaxStats",res.locals.token,{_t_age:quant+"m",filter:{
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}}, cb);
						},
						breakdown: function (cb) {
							api("stats.getAjaxBreakdown", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend},
									_s_name: req.query.selected
								}}, cb)
						},
						graphs: function (cb) {
							api("stats.getAjaxTimings", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend},
									_s_name: req.query.selected
								}}, cb)
						}
					}, safe.sure(cb, function(r){
						var stat = {};
						stat.apdex=0; stat.r=0; stat.tta=0; stat.e=0;
						_.forEach(r.graphs, function(r) {
							r = r.value;
							stat.apdex+=r.apdex;
							stat.r+=r.r;
							stat.tta+=r.tta;
							stat.e+=r.e;
						})
						var c = r.graphs.length;
						stat.apdex=stat.apdex/c;
						stat.r=stat.r/c;
						stat.tta=stat.tta/c/1000;
						stat.epm=stat.e/c;
						stat.e=stat.epm/stat.r;

						// sorting "mtc", "sar" etc
						r.rpm =_.sortBy(r.rpm, function(v){
							if (st == "rpm")
								return -1*v.value.c;
							if (st == "mtc")
								return -1* (v.value.tt);
							if (st == "sar")
								return -1* v.value.tt/v.value.c;
							if (st == "wa")
								return 1* v.value.apdex;
						});
						var sum=0;
						_.each(r.rpm, function(r){
							if (st == "rpm")
								sum+=r.value.c;
							if (st == "mtc")
								sum += r.value.tt;
							if (st == "sar")
								sum += r.value.tt/r.value.c;
							if (st == "wa")
								sum += r.value.apdex;
						});
						var percent = sum/100;
						_.each(r.rpm, function (r) {
							if (st == "rpm")
								r.value.bar = Math.round(r.value.c/percent);
							if (st == "mtc")
								r.value.bar = Math.round(r.value.tt/percent);
							if (st == "sar")
								r.value.bar = Math.round(r.value.tt/r.value.c/percent);
							if (st == "wa")
								r.value.bar = r.value.apdex*100;
							r.value.r = r.value.c/((res.locals.dtend - res.locals.dtstart)/(1000*60))
							r.value.tta = (r.value.tt/r.value.c/1000);
						 });
						_.each(r.breakdown, function (r) {
							r.value.tta = r.value.tt/r.value.c;
						})
						 res.renderX({view:r.view,data:{rpm:r.rpm,breakdown:r.breakdown,graphs:r.graphs, project:project, st: st, title:"Ajax", stat:stat, query:req.query.selected}})
						})
					)
				}
			))
		},
		application:function (req, res, cb) {
			var st = req.params.stats;
			var quant = res.locals.quant;
			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/application/application"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getActionStats", res.locals.token, {
								_t_age: quant + "m", filter: {
									_idp: project._id,
									_s_cat:"WebTransaction",
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								}
							}, cb)
						},
						breakdown: function (cb) {
							if (!req.query.selected)
								return safe.back(cb,null,[]);
							api("stats.getActionBreakdown", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend},
									_s_name: req.query.selected
								}}, cb)
						},
						graphs: function (cb) {
							var filter = {
								_idp: project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend},
								_s_cat:"WebTransaction"
							}
							if (req.query.selected)
								filter._s_name = req.query.selected;
							api("stats.getActionTimings", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: filter}, cb)
						}
					}, safe.sure(cb, function(r){
						var stat = {};
						stat.apdex=0; stat.rpm=0; stat.tta=0;
						_.forEach(r.graphs, function(r) {
							r = r.value;
							stat.apdex+=r.apdex;
							stat.rpm+=r.r;
							stat.tta+=r.tta;
						})
						var c = r.graphs.length;
						stat.apdex=stat.apdex/c;
						stat.tta=stat.tta/c/1000;
						stat.rpm=stat.rpm/c;

						// sorting "mtc", "sar" etc
						r.data =_.sortBy(r.data, function(v){
							if (st == "rpm")
								return -1*v.value.c;
							if (st == "mtc")
								return -1* (v.value.tt);
							if (st == "sar")
								return -1* v.value.tt/v.value.c;
							if (st == "wa")
								return 1* v.value.apdex;
						});
						var sum=0;
						_.each(r.data, function(r){
							if (st == "rpm")
								sum+=r.value.c;
							if (st == "mtc")
								sum += r.value.tt;
							if (st == "sar")
								sum += r.value.tt/r.value.c;
							if (st == "wa") {
								sum += r.value.apdex;
							}
						});
						var percent = sum/100;
						_.each(r.data, function (r) {
							if (st == "rpm")
								r.value.bar = Math.round(r.value.c/percent);
							if (st == "mtc")
								r.value.bar = Math.round((r.value.tt)/percent);
							if (st == "sar")
								r.value.bar = Math.round(r.value.tt/r.value.c/percent);
							if (st == "wa")
								r.value.bar = r.value.apdex * 100;
							r.value.r = r.value.c/((res.locals.dtend - res.locals.dtstart)/(1000*60))
							r.value.tta = r.value.tt/r.value.c/1000;
						});

						_.each(r.breakdown, function (r) {
							r.value.cnt = r.value.c;
							r.value.tta = r.value.tt/r.value.c;
							r.value.owna = r.value.ot/r.value.c;
						})

						res.renderX({view:r.view,data:{data:r.data,breakdown:r.breakdown,graphs:r.graphs, title:"Application", st: st, query:req.query.selected,project:project,stat:stat}})
					})
				)
			}))
		},
		pages:function (req, res, cb) {
			var st = req.params.stats;
			var quant = res.locals.quant;
			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/pages/pages"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getPageStats", res.locals.token, {
								_t_age: quant + "m", filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
								}
							}, cb)
						},
						breakdown: function (cb) {
							api("stats.getPageBreakdown", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend},
									_s_route: req.query.selected
								}}, cb)
						},
						graphs: function (cb) {
							api("stats.getPageTimings", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend},
									_s_route: req.query.selected
								}}, cb)
						}
					}, safe.sure(cb, function(r){
						var stat = {};
						stat.apdex=0; stat.r=0; stat.tta=0; stat.e=0;
						_.forEach(r.graphs, function(r) {
							r = r.value;
							stat.apdex+=r.apdex;
							stat.r+=r.r;
							stat.tta+=r.tta;
							stat.e+=r.e;
						})
						var c = r.graphs.length;
						stat.apdex=stat.apdex/c;
						stat.tta=stat.tta/c/1000;
						stat.r=stat.r/c;
						stat.epm=stat.e/c;
						stat.erate=stat.epm/stat.r;

						// sorting "mtc", "sar" etc
						r.data =_.sortBy(r.data, function(v){
							if (st == "rpm")
								return -1*v.value.c;
							if (st == "mtc")
								return -1*v.value.tt;
							if (st == "sar")
								return -1*v.value.tt/v.value.c;
							if (st == "wa")
								return 1*v.value.apdex;
						});
						var sum=0;
						_.each(r.data, function(r){
							if (st == "rpm")
								sum+=r.value.c;
							if (st == "mtc")
								sum += r.value.tt;
							if (st == "sar")
								sum += r.value.tt/r.value.c;
							if (st == "wa") {
								sum += r.value.apdex;
							}
						});
						var percent = sum/100;
						_.each(r.data, function (r) {
							if (st == "rpm")
								r.value.bar = Math.round(r.value.c/percent);
							if (st == "mtc")
								r.value.bar = Math.round((r.value.tt)/percent);
							if (st == "sar")
								r.value.bar = Math.round(r.value.tt/r.value.c/percent);
							if (st == "wa")
								r.value.bar = r.value.apdex * 100;
							r.value.r = r.value.c/((res.locals.dtend - res.locals.dtstart)/(1000*60))
							r.value.tta = r.value.tt/r.value.c/1000;
						});
						_.each(r.breakdown, function (r) {
							r.value.tta = r.value.tt/r.value.c;
						})
						res.renderX({view:r.view,data:{data:r.data,breakdown:r.breakdown,graphs:r.graphs, title:"Pages", st: st, query:req.query.selected,project:project,stat:stat}})
					})
				)
			}))
		},
		errors:function (req, res, cb) {
			// we want to server on folder style url
			if (req.path.substr(-1) != "/" && !req.params.id)
				return res.redirect(req.baseUrl+req.path+"/");
			var st = req.params.sort,
				quant = res.locals.quant,
				dtp;

			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				dtp = (project._dtPagesErrAck || res.locals.dtstart).valueOf();
				res.locals.dtstart = (dtp < res.locals.dtstart)?dtp:res.locals.dtstart;
				res.locals.dtcliack = dtp;
				safe.run(function (cb) {
					if (req.params.id)
						api("stats.getPageError", res.locals.token, {_t_age:"30d", filter:{_id:req.params.id}}, cb)
					else
						cb()
				}, safe.sure(cb, function (error) {
					var plan = error?{
						prev: function (cb) {
							api("stats.getPageError",res.locals.token,{_t_age:"10d",filter:{_id:{$lt:error._id},_idp:project._id,ehash:error.ehash},sort:{_id:-1}}, cb);
						},
						next: function (cb) {
							api("stats.getPageError",res.locals.token,{_t_age:"10m",filter:{_id:{$gt:error._id},_idp:project._id,ehash:error.ehash},sort:{_id:1}}, cb);
						},
					}:{};

					var params1 = {_t_age:"10m",filter:{
						_idp:project._id,
						_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
					}}
					var params2 = error?_.merge({filter:{ehash:error.ehash}},params1):params1;

					plan = _.extend(plan, {
						view: function (cb) {
							requirejs(["views/client-errors/err"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getPageErrorStats",res.locals.token,params1, cb);
						},
						info: function (cb) {
							api("stats.getPageErrorInfo",res.locals.token,params2, cb)
						},
						rpm: function (cb){
							api("stats.getPageErrorTimings", res.locals.token,_.extend({quant:quant},params2), cb)
						},
						obac: function (cb) {
							api("obac.getPermissions", res.locals.token, {_t_age:"10m",rules:[{action:"project_edit",_id:project._id}]}, cb);
						}
					})
					safe.parallel( plan, safe.sure(cb, function(r){
						r.event = {event:error?error:false,info:r.info};
						var lastAck = moment(dtp).fromNow()
						var f = null;
						if (st == "terr" ||st === undefined || st == 'mr')
							f = 'count';
						else if (st == "perr")
							f = 'pages';
						else if (st == "serr")
							f = 'session';

						var sum = 0.0;
						_.forEach(r.data, function(r) {
							sum += r.stats[f];
						});
						var percent = sum/100;
						_.forEach(r.data, function(r) {
							r.bar = r.stats[f]/percent;
						});
						r.data = _.sortBy(r.data, function(r) {
							if (st == "mr")
								return r.error._dtf*-1;
							else
								return r.stats[f]*-1;
						});
						res.renderX({view:r.view,data:_.extend(r,{title:"Errors",
							st: st, project: project, lastAck: lastAck,
							id:req.params.id})})
					}))
				}))
			}))
		},
		database:function (req, res, cb) {
			var st = req.params.stats
			var str = req.query._str || req.cookies.str || '1d';
			var quant = res.locals.quant;

			var dtstart = res.locals.dtstart;
			var dtend = res.locals.dtend;
			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/database/database"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getActionSegmentStats", res.locals.token, {
								_t_age: quant + "m",
								quant: quant,
								filter: {
									_idp: project._id,
									_dt: {$gt: dtstart, $lte: dtend},
									'data._s_cat':'Datastore'
								}
							}, cb)
						},
						breakdown: function (cb) {
							api("stats.getActionSegmentBreakdown", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: dtstart, $lte: dtend},
									'data._s_name': req.query.selected
								}}, cb)
						},
						graphs: function (cb) {
							api("stats.getActionSegmentTimings", res.locals.token, {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: project._id,
									_dt: {$gt: dtstart, $lte: dtend},
									'data._s_cat':'Datastore',
									'data._s_name': req.query.selected
								}}, cb)
						}
					}, safe.sure(cb, function(r){
						var filter = {
							_t_age: quant + "m", quant: quant,
							filter: {
								_idp: project._id,
								_dt: {$gt: dtstart, $lte: dtend}
							}
						}
						var stat = {};
						stat.tta=0; stat.r=0;
						_.forEach(r.graphs, function(r) {
							r = r.value;
							stat.r+=r.r;
							stat.tta+=r.tta;
						})
						var c = r.graphs.length;
						stat.tta=stat.tta/c/1000;
						stat.r=stat.r/c;

						// sorting "req" , "mtc" etc
						 var sum = 0;
						 _.forEach(r.data, function(r) {
							if (st == "req")
								sum += r.value.c;
							if (st == 'mtc')
								sum += r.value.tt;
							if (st == 'sar')
								sum += r.value.tt/r.value.c;
						 });
						 var procent = sum/100;
						 _.forEach(r.data, function(r) {
							if (st == 'req')
								r.value.bar = r.value.c/procent;
							if (st == 'mtc')
								r.value.bar = r.value.tt/procent;
							if (st == 'sar')
								r.value.bar = r.value.tt/r.value.c/procent;
							r.value.r = r.value.c/((res.locals.dtend - res.locals.dtstart)/(1000*60))
							r.value.tta = r.value.tt/r.value.c/1000;
						 });
						 r.data = _.sortBy(r.data, function(r) {
							if (st == 'req')
								return r.value.c*-1;
							if (st == 'mtc')
								return (r.value.tt)*-1;
							if (st == 'sar')
								return r.value.tt/r.value.c*-1;
						});
						_.each(r.breakdown, function (r) {
							r.value.cnt = r.value.c;
							r.value.tta = r.value.tt/r.value.c;
						})
						res.renderX({view:r.view,route:req.route.path,data:{data: r.data, breakdown:r.breakdown,graphs:r.graphs, title:"Database/Statements", st: st, fr: filter, query:req.query.selected,project:project,stat:stat}})
					})
				)
			}))
		},
		server_errors: function(req,res,cb) {
			// we want to server on folder style url
			if (req.path.substr(-1) != "/" && !req.params.id)
				return res.redirect(req.baseUrl+req.path+"/");
			var quant = res.locals.quant,
				dta,
				st = req.params.sort;

			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				dta = (project._dtActionsErrAck || res.locals.dtstart).valueOf();
				res.locals.dtstart = (dta < res.locals.dtstart)?dta:res.locals.dtstart;
				res.locals.dtseack = dta;
				safe.run(function (cb) {
					if (req.params.id)
						api("stats.getActionError", res.locals.token, {_t_age:"30d", filter:{_id:req.params.id}}, cb)
					else
						cb()
				}, safe.sure(cb, function (error) {
					var plan = error?{
						prev: function (cb) {
							api("stats.getActionError",res.locals.token,{_t_age:"10d",filter:{_id:{$lt:error._id},_idp:project._id,ehash:error.ehash},sort:{_id:-1}}, cb);
						},
						next: function (cb) {
							api("stats.getActionError",res.locals.token,{_t_age:"10m",filter:{_id:{$gt:error._id},_idp:project._id,ehash:error.ehash},sort:{_id:1}}, cb);
						},
					}:{};

					var params1 = {_t_age:"10m",filter:{
						_idp:project._id,
						_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
					}}
					var params2 = error?_.merge({filter:{ehash:error.ehash}},params1):params1;

					plan = _.extend(plan, {
						view: function (cb) {
							requirejs(["views/server-errors/server-err"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						data: function (cb) {
							api("stats.getActionErrorStats",res.locals.token,params1, cb);
						},
						info: function (cb) {
							api("stats.getActionErrorInfo",res.locals.token,params2, cb)
						},
						rpm: function (cb){
							api("stats.getActionErrorTimings", res.locals.token,_.extend({quant:quant},params2), cb)
						},
						obac: function (cb) {
							api("obac.getPermissions", res.locals.token, {_t_age:"10m",rules:[{action:"project_edit",_id:project._id}]}, cb);
						}
					})
					safe.parallel( plan, safe.sure(cb, function(r){
						r.event = {event:error?error:false,info:r.info};
						var lastAck = moment(dta).fromNow()

						var sum = 0.0;
						_.forEach(r.data, function(r) {
							sum += r.stats.c;
						});
						var percent = sum/100;
						_.forEach(r.data, function(r) {
							r.bar = r.stats.c/percent;
						});
						r.data = _.sortBy(r.data, function(r) {
							if (st == "mr")
								return r.error._dtf*-1;
							else
								return r.stats.c*-1;
						});
						res.renderX({view:r.view,data:_.extend(r,
							{title:"Server-errors", st: st, project:project,
							lastAck: lastAck, id:req.params.id})})
					}))
				}));
			}))
		},
		settings: function(req,res,cb) {
			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
						view: function (cb) {
							requirejs(["views/project-settings/settings"], function (view) {
								safe.back(cb, null, view)
							},cb)
						},
						apdexConfig: function(cb) {
							api("assets.getProjectApdexConfig", res.locals.token, {_id:project._id}, cb)
						},
						obac: function (cb) {
							api("obac.getPermissions", res.locals.token, {rules:[{action:"project_edit",_id:project._id}]}, cb);
						}
					},safe.sure(cb, function(r){
						res.renderX({view:r.view,data:{title:"Settings", project:project, apdexConfig: r.apdexConfig, obac: r.obac}})
					})
				)
			}))
		},
		metrics: function(req,res,cb) {
			var quant = res.locals.quant;
			api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
				safe.parallel({
					view: function (cb) {
						requirejs(["views/metrics/metrics"], function (view) {
							safe.back(cb, null, view)
						},cb)},
					memory: function(cb) {
						api('stats.getMetricTimings',res.locals.token,{quant:quant,
							filter:{
								_s_type: "Memory/Physical",
								_idp:project._id,
								_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
							}
						},cb)}
				},safe.sure(cb, function(r){
					res.renderX({view:r.view,data:{title:"Metrics", project:project, mem: r.memory}})
				}))

			}))
		}
	}
})
