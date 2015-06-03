/*jslint node: true */
/*global emit, Q, AG, AA, CAT, QUANT, NAME, ALL */
"use strict";
var _ = require("lodash");
var safe = require("safe");
var mongo = require("mongodb");
var moment = require("moment");
var request = require('request');
var CustomError = require('tinyback').CustomError;

module.exports.deps = ['mongo','prefixify','validate'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.parallel([
			function (cb) {
				db.collection("page_errors",cb);
			},
			function (cb) {
				db.collection("pages",cb);
			},
			function (cb) {
				db.collection("page_reqs", cb);
			},
			function (cb) {
				db.collection("actions", cb);
			},
			function (cb) {
				db.collection("action_stats", cb);
			},
			function (cb) {
				db.collection("action_errors", cb);
			},
			function (cb) {
				db.collection("metrics", cb);
			}
		],safe.sure_spread(cb, function (events,pages,ajax, actions, as, serverErrors, metrics) {
			cb(null, {api:{
				getErrAck: function(t,p,cb) {
					safe.parallel({
						actions:function(cb) {
							var q = {
								_idp: p._idp,
								_dt: {
									$lte: p._dt.$lte,
									$gt: p._dt._dtActionsErrAck
								}
							};
							q = queryfix(q);
							serverErrors.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
								cb(null, res.length);
							}));
						},
						dtlActions: function(cb) {
							var q = {
								_idp: p._idp,
								_dtf: {
									$lte: p._dt.$lte,
									$gt: p._dt._dtActionsErrAck
								}
							};
							q = queryfix(q);
							serverErrors.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
								cb(null, res.length);
							}));
						},
						pages:function(cb) {
							var q = {
								_idp: p._idp,
								_dt: {
									$lte: p._dt.$lte,
									$gt: p._dt._dtPagesErrAck
								}
							};
							q = queryfix(q);
							events.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
								cb(null, res.length);
							}));
						},
						dtlPages: function(cb) {
							var q = {
								_idp: p._idp,
								_dtf: {
									$lte: p._dt.$lte,
									$gt: p._dt._dtPagesErrAck
								}
							};
							q = queryfix(q);
							events.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
								cb(null, res.length);
							}));
						}
					},cb);
				},
				getMetrics: function(t, p, cb) {
					var query = queryfix(p.filter);
					metrics.mapReduce(
						function() {
							/* global emit */
							emit(this._s_pid, {mem: (this._f_val/this._i_cnt)});
						},
						function(k,v) {
							var r = null;
							v.forEach(function(v) {
								if (!r) {
									r = v;
								}
								else {
									r.mem = (r.mem + v.mem)/2;
								}
							});
							return r;
						},
						{
							query: query,
							out:{inline: 1}
						},
						safe.sure(cb, function(data) {
							var memtt = 0;
							_.forEach(data,function(r) {
								memtt += parseInt(r.value.mem);
							});
							cb(null,{proc: data.length, mem: memtt});
						})
					);
				},
				getActionsTimings: function(t, p, cb) {
					var query = queryfix(p.filter);
					query._s_cat = "WebTransaction";
					ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
						var ApdexT = apdex._i_serverT;
						actions.mapReduce(
							function() {
								emit(parseInt(this._dt.valueOf()/(Q*60000)), {
									c:1,
									r: 1.0/Q,
									tt: this._i_tt,
									ag:(this._i_err)?0:((this._i_tt <= AG) ? 1 : 0),
									aa: (this._i_err)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)
								});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r) {
										r = v;
									}
									else {
										r.tt+=v.tt;
										r.r+=v.r;
										r.c+=v.c;
										r.ag+=v.ag;
										r.aa+=v.aa;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
							}, safe.sure(cb, function (data) {
								// calculate apdex and average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.apdex = (key.ag+key.aa/2)/key.c;
									key.tta = key.tt/key.c;
								});
								cb(null, data);
							})
						);
					}));
				},
				getActionsStats: function(t, p , cb) {
					var query = queryfix(p.filter);
					query._s_cat = "WebTransaction";
					ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
						var ApdexT = apdex._i_serverT;
						actions.mapReduce(
							function() {
								emit(this._s_name, {c:1, r: 1.0/Q, tt: this._i_tt,
									ag:(this._i_tt <= AG) ? 1 : 0, aa: (this._i_tt > AG && this._i_tt <= AA) ? 1 : 0});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r) {
										r = v;
									}
									else {
										r.tt+=v.tt;
										r.r+=v.r;
										r.c+=v.c;
										r.ag+=v.ag;
										r.aa+=v.aa;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
							},
							safe.sure(cb, function(data) {
								// calculate apdex and average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.apdex = (key.ag+key.aa/2)/key.c;
									key.tta = key.tt/key.c;
								});
								cb(null, data);
							})
						);
					}));
				},
				getAjaxStats: function(t, p, cb) {
					var query = queryfix(p.filter);

					ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
						var ApdexT = apdex._i_ajaxT;
						ajax.mapReduce(
							function() {
								emit(this._s_name, {c:1, r: 1.0/Q, tt: this._i_tt, e:1.0*(this._i_code != 200 ? 1:0 )/Q,
									ag:(this._i_tt <= AG) ? 1 : 0, aa: (this._i_tt > AG && this._i_tt <= AA) ? 1 : 0});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r) {
										r = v;
									}
									else {
										r.tt += v.tt;
										r.c+=v.c;
										r.r+=v.r;
										r.e+=v.e;
										r.ag+=v.ag;
										r.aa+=v.aa;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
							},safe.sure(cb, function (data) {
								// calculate average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.apdex = (key.ag+key.aa/2)/key.c;
									key.tta = key.tt/key.c;
									key.e = key.e/key.c;
								});
								cb(null, data);
							})
						);
					}));
				},
				getPagesStats: function(t, p, cb) {
					var query = queryfix(p.filter);
					ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
						var ApdexT = apdex._i_pagesT;
						pages.mapReduce(
							function() {
								emit(this._s_route, {c:1, r: 1.0/Q, tt: this._i_tt, e:1.0*(this._i_err?1:0)/Q,
									ag:(this._i_tt <= AG) ? 1 : 0, aa: (this._i_tt > AG && this._i_tt <= AA) ? 1 : 0});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r) {
										r = v;
									}
									else {
										r.tt+=v.tt;
										r.r+=v.r;
										r.c+=v.c;
										r.e+=v.e;
										r.ag+=v.ag;
										r.aa+=v.aa;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
							}, safe.sure(cb, function (data) {
								// calculate apdex and average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.apdex = (key.ag+key.aa/2)/key.c;
									key.tta = key.tt/key.c;
									key.e = key.e/key.c;
								});
								cb(null, data);
							})
						);
					}));
				},
				getPageError:function (t, p, cb) {
					// dummy, just get it all out
					events.findOne({_id:new mongo.ObjectID(p._id)},cb);
				},
				getServerErrorInfo:function (t, p, cb) {
					var query = queryfix(p.filter);
					safe.run(function (cb) {
						// to identify error type we can provide id of existing error
						if (!query._id)
							// overwise we assume that called knows what to do
							return cb();
						// then we need to fetch it and grap required info (projec and ehash)
						serverErrors.findOne({_id:query._id}, safe.sure(cb, function (err) {
							if (!err)
								cb(new CustomError("No event found", "Not Found"));
							query.ehash = err.ehash;
							delete query._id;
							cb();
						}));
					},safe.sure(cb, function () {
						serverErrors.mapReduce(function () {
								var route = {};
								if (this.action){
									route[this.action._s_name]=1;
								}
								var reporter = {}; reporter[this._s_reporter]=1;
								var server = {}; server[this._s_server]=1;
								var lang = {}; lang[this._s_logger]=1;
								var ids = [this._id];
								emit(ALL?this._idp:this.ehash,{c:1,route:route,reporter:reporter,server:server,lang:lang,ids:ids});
							},
							function (k, v) {
								var r=null;
								v.forEach(function (v) {
									var k;
									if (!r)
										r = v;
									else {
										r.ids = r.ids.concat(v.ids);
										r.c+=v.c;
										for (k in v.route) {
											r.route[k]=(r.route[k] || 0) + v.route[k];
										}
										for (k in v.reporter) {
											r.reporter[k]=(r.reporter[k] || 0) + v.reporter[k];
										}
										for (k in v.server) {
											r.server[k]=(r.server[k] || 0) + v.server[k];
										}
										for (k in v.lang) {
											r.lang[k]=(r.lang[k] || 0) + v.lang[k];
										}
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {ALL:query.ehash?0:1}
							},
							safe.sure(cb, function (stats) {
								var res = stats[0].value;
								var res1 = {route:[],server:[],reporter:[],lang:[], count:res.c,ids:_.sortBy(res.ids)};
								_.each(res.route, function (v,k) {
									res1.route.push({k:k,v:v});
								});
								_.each(res.server, function (v,k) {
									res1.server.push({k:k,v:v});
								});
								_.each(res.reporter, function (v,k) {
									res1.reporter.push({k:k,v:v});
								});
								_.each(res.lang, function (v,k) {
									res1.lang.push({k:k,v:v});
								});
								cb(null,res1);
							})
						);
					}));
				},
				getServerError:function (t, p, cb) {
					// dummy, just get it all out
					serverErrors.findOne({_id:new mongo.ObjectID(p._id)},cb);
				},
				getAjaxTimings:function(t, p, cb) {
					var query = queryfix(p.filter);
					query =(p._idurl)? _.extend(query,{_s_name:p._idurl}): query;
					ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
						var ApdexT = apdex._i_ajaxT;
						ajax.mapReduce(
							function() {
								emit(parseInt(this._dt.valueOf()/(Q*60000)), {c:1, r: 1.0/Q, tt: this._i_tt, pt: this._i_pt, code: this._i_code,
									e:1.0*(this._i_code != 200 ? 1:0 )/Q, ag:(this._i_tt <= AG) ? 1 : 0, aa: (this._i_tt > AG && this._i_tt <= AA) ? 1 : 0});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r) {
										r = v;
									}
									else {
										r.tt+=v.tt;
										r.r+=v.r;
										r.c+=v.c;
										r.ag+=v.ag;
										r.aa+=v.aa;
										r.e+=v.e;
										r.pt+= v.pt;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
							},safe.sure(cb, function (data) {
								// calculate apdex and average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.apdex = (key.ag+key.aa/2)/key.c;
									key.tta = key.tt/key.c;
								});
								cb(null, data);
							})
						);
					}));

				},
				getPagesTimings:function (t, p, cb) {
					var query = queryfix(p.filter);
					ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
						var ApdexT = apdex._i_pagesT;
						pages.mapReduce(function () {
								emit(parseInt(this._dt.valueOf()/(Q*60000)), {c:1, r: 1.0/Q, tt: this._i_tt, e:1.0*(this._i_err?1:0)/Q,
									ag:(this._i_err)?0:((this._i_tt <= AG) ? 1 : 0),
									aa:(this._i_err)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)});
							},
							function (k, v) {
								var r=null;
								v.forEach(function (v) {
									if (!r) {
										r = v;
									}
									else {
										r.tt+=v.tt;
										r.r+=v.r;
										r.c+=v.c;
										r.ag+=v.ag;
										r.aa+=v.aa;
										r.e+=v.e;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
							}, safe.sure(cb, function (data) {
								// calculate apdex and average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.apdex = (key.ag+key.aa/2)/key.c;
									key.tta = key.tt/key.c;
								});
								cb(null, data);
							})
						);
					}));

				},
				getPagesErrorInfo:function (t, p, cb) {
					var query = queryfix(p.filter);
					safe.run(function (cb) {
						// to identify error type we can provide id of existing error
						if (!query._id)
							// overwise we assume that called knows what to do
							return cb();
						// then we need to fetch it and grap required info (projec and ehash)
						events.findOne({_id:query._id}, safe.sure(cb, function (event) {
							if (!event)
								cb(new CustomError("No event found", "Not Found"));
							query.ehash = event.ehash;
							delete query._id;
							cb();
						}));
					},safe.sure(cb, function () {
						events.mapReduce(function () {
								var route = {}; route[this.request._s_route]=1;
								var browser = {}; browser[this.agent.family+" "+this.agent.major]=1;
								var os = {}; os[this.agent.os.family]=1;
								var sessions = {}; sessions[this.shash]=1;
								var views = {}; views[this._idpv]=1;
								var ids = [this._id];
								emit(ALL?this._idp:this.ehash,{c:1,route:route,browser:browser,os:os,sessions:sessions,views:views,ids:ids});
							},
							function (k, v) {
								var r=null;
								v.forEach(function (v) {
									var k;
									if (!r)
										r = v;
									else {
										r.ids = r.ids.concat(v.ids);
										for (k in v.sessions) {
											r.sessions[k]=1;
										}
										for (k in v.views) {
											r.views[k]=1;
										}
										r.c+=v.c;
										for (k in v.route) {
											r.route[k]=(r.route[k] || 0) + v.route[k];
										}
										for (k in v.browser) {
											r.browser[k]=(r.browser[k] || 0) + v.browser[k];
										}
										for (k in v.os) {
											r.os[k]=(r.os[k] || 0) + v.os[k];
										}
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {ALL:query.ehash?0:1}
							},
							safe.sure(cb, function (stats) {
								var res1 = {route:[],os:[],browser:[],count:0,sessions:0,views:0,ids:[]};
								if (stats.length) {
									var res = stats[0].value;
									res1.count = res.c;
									res1.sessions = _.size(res.sessions);
									res1.views = _.size(res.views);
									res1.ids =_.sortBy(res.ids);
									_.each(res.route, function (v,k) {
										res1.route.push({k:k,v:v});
									});
									_.each(res.os, function (v,k) {
										res1.os.push({k:k,v:v});
									});
									_.each(res.browser, function (v,k) {
										res1.browser.push({k:k,v:v});
									});
								}
								cb(null,res1);
							})
						);
					}));
				},
				getPagesErrorStats:function (t, p, cb) {
					var query = queryfix(p.filter);
					safe.run(function (cb) {
						// to identify error type we can provide id of existing error
						if (!query._id)
							// overwise we assume that called knows what to do
							return cb();
						// then we need to fetch it and grap required info (projec and ehash)
						events.findOne({_id:query._id}, safe.sure(cb, function (event) {
							if (!event)
								cb(new CustomError("No event found", "Not Found"));
							query.ehash = event.ehash;
							delete query._id;
							cb();
						}));
					},safe.sure(cb, function () {
						events.mapReduce(function () {
								var s = {}; s[this.shash]=1;
								var epm = {}; epm[this._idpv]=1;
								emit(this.ehash,{count:1,session:s,_dtmax:this._dt,_dtmin:this._dt, _id:this._id,pages:epm});
							},
							function (k, v) {
								var r=null;
								v.forEach(function (v) {
									var k;
									if (!r)
										r = v;
									else {
										for (k in v.session) {
											r.session[k]=1;
										}
										for (k in v.pages) {
											r.pages[k]=1;
										}
										r.count+=v.count;
										r._dtmin = Math.min(r._dtmin, v._dtmin);
										r._dtmax = Math.min(r._dtmax, v._dtmax);
										if (r._dtmax==v._dtmax)
											r._id = v._id;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							safe.sure(cb, function (stats) {
								_.each(stats, function (s) {
									s.value.session = _.size(s.value.session);
									s.value.pages = _.size(s.value.pages);
								} );
								stats = _.sortBy(stats, function (s) { return -1*s.value.session*s.value.pages; } );
								var ids = {};
								_.each(stats, function (s) {
									ids[s.value._id]={stats:s.value};
								} );
								events.find(queryfix({_id:{$in:_.keys(ids)}}))
									.toArray(safe.sure(cb, function (errors) {
										_.each(errors, function (e) {
											ids[e._id].error = e;
										});
										var data = _.values(ids);
										var f = null;
										if (p.st == "terr" || p.st === undefined || p.st == 'mr')
											f = 'count';
										if (p.st == "perr")
											f = 'pages';
										if (p.st == "serr")
											f = 'session';
										var sum = 0.0;
										_.forEach(data, function(r) {
											sum += r.stats[f];
										});
										var percent = sum/100;
										_.forEach(data, function(r) {
											r.bar = r.stats[f]/percent;
										});
										data = _.sortBy(data, function(r) {
											if (p.st == "mr")
												return new Date(r.error._dtf)*-1;
											else
												return r.stats[f]*-1;
										});
										cb(null, data);
									}));
							})
						);
					}));
				},
				getPagesErrorTiming:function(t, p, cb) {
					var query = queryfix(p.filter);
					safe.run(function (cb) {
						// to identify error type we can provide id of existing error
						if (!query._id)
							// overwise we assume that called knows what to do
							return cb();
						// then we need to fetch it and grap required info (projec and ehash)
						events.findOne({_id:query._id}, safe.sure(cb, function (event) {
							if (!event)
								cb(new CustomError("No event found", "Not Found"));
							query._idp = event._idp;
							query.ehash = event.ehash;
							delete query._id;
							cb();
						}));
					},safe.sure(cb, function () {
						events.mapReduce(
							function() {
								emit(parseInt(this._dt.valueOf()/(Q*60000)), { r:1.0/Q});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r){
										r = v;
									}
									else {
										r.r+=v.r;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q:p.quant || 1}
							},
							cb
						);
					}));
				},
				getServerErrorTimings:function(t, p, cb) {
					var query1 = queryfix(p.filter);
					var q = p.quant || 1;
					serverErrors.findOne(query1, safe.sure(cb, function (event) {
						if (event) {
							var query =(query1._id)? {_idp:event._idp, _s_message:event._s_message,_dt:query1._dt}: query1;
							serverErrors.mapReduce(
								function() {
									emit(parseInt(this._dt.valueOf()/(Q*60000)), { r:1.0/Q});
								},
								function (k,v) {
									var r=null;
									v.forEach(function (v) {
										if (!r){
											r = v;
										}
										else {
											r.r+=v.r;

										}
									});
									return r;
								},
								{
									query: query,
									out: {inline:1},
									scope: {Q:q}
								},
								cb
							);
						}
						else
							cb();
					}));
				},
				getServerErrorStats:function (t, p, cb) {
					var query = queryfix(p.filter);
					serverErrors.mapReduce(function () {
							emit(this.ehash,{c:1,_dtmax:this._dt,_dtmin:this._dt, _id:this._id});
						},
						function (k, v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v;
								else {
									r.c+=v.c;
									r._dtmin = Math.min(r._dtmin, v._dtmin);
									r._dtmax = Math.min(r._dtmax, v._dtmax);
									if (r._dtmax==v._dtmax)
										r._id = v._id;
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						safe.sure(cb, function (stats) {
							stats = _.sortBy(stats, function (s) { return (-1*s.value.c); } );
							var ids = {};
							_.each(stats, function (s) {
								ids[s.value._id]={stats:s.value, error: s._id};
							} );
							serverErrors.find(queryfix({_id:{$in:_.keys(ids)}}))
								.toArray(safe.sure(cb, function (errors) {
									_.each(errors, function (e) {
										ids[e._id].error = e;
									});

									ids = _(ids).values().sortBy(function(r){
										if (p.st == 'terr')
											return r.stats.c * -1;
										if (p.st == 'mr')
											return new Date(r.error._dtf)*-1;
									}).value();
									cb(null, ids);
								}));
						})
					);
				},
				getActionsBreakdown: function(t,p, cb) {
					var query = queryfix(p.filter);
					query._s_cat = "WebTransaction";
					as.mapReduce(
						function() {
								this.data.forEach(function(k,v) {
									emit(k._s_name, {cnt: k._i_cnt, tt: k._i_tt, own: k._i_own});
								});
						},
						function (k,v) {
							var r=null;
							v.forEach(function(v) {
								if (!r) {
									r = v;
								}
								else {
									r.tt += v.tt;
									r.cnt += v.cnt;
									r.own += v.own;
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1}
						}, safe.sure(cb, function (data) {
							// calculate average after aggregation
							_.each(data, function (metric) {
								var key = metric.value;
								key.tta = key.tt/key.cnt;
								key.owna = key.own/key.cnt;
							});
							cb(null, data);
						})
					);
				},
				getActionsCategoryStats: function(t,p, cb) {
					var query = queryfix(p.filter);
					query['data._s_cat'] = "Datastore";
					var st = p.st;
					var q = p.quant || 1;
					as.mapReduce(
						function() {
							this.data.forEach(function(k) {
								if (k._s_cat == CAT) {
									emit(k._s_name, {tt: k._i_tt, r: k._i_cnt, avg1: k._i_tt/k._i_cnt});
								}
							});
						},
						function (k,v) {
							var r = null;
							v.forEach(function(v) {
								if (!r) {
									r = v;
								}
								else {
									r.tt += v.tt;
									r.avg1 += v.avg1;
									r.r += v.r;
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1},
							scope: {CAT: query['data._s_cat']}
						},
						safe.sure(cb, function(data) {
							_.each(data, function (metric) {
								var key = metric.value;
								key.avg = key.avg1/key.r;
								key.tta = key.tt/key.r;
							});
							cb(null, data);
						})
					);
				},
				getPagesBreakDown: function(t,p,cb){
					var query = queryfix(p.filter);
					pages.find(query,{_id: 1}).toArray(safe.sure(cb, function(data){
						delete query._s_uri;
						var idpv = [];
						_.forEach(data, function(r){
							idpv.push(r._id);
						});
						query._idpv = {$in: idpv};
						ajax.mapReduce(
							function() {
								emit(this._s_name, {c:1, r: 1.0/Q, tt: this._i_tt});
							},
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r)
										r = v;
									else {
										r.r += v.r;
										r.tt+=v.tt;
										r.c+=v.c;
									}
								});
								return r;
							},
							{
								query: query,
								out: {inline:1},
								scope: {Q: p.quant || 1}
							}, safe.sure(cb, function (data) {
								// calculate average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.tta = key.tt/key.c;
								});
								cb(null, data);
							})
						);
					}));
				},
				getAjaxBreakDown: function(t,p,cb){
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					ajax.mapReduce(
						function() {
							if (this._s_route)
								emit(this._s_route, {c:1, tt: this._i_tt} );
						},
						function (k,v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v;
								else {
									r.tt+=v.tt;
									r.c+=v.c;
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1}
						}, safe.sure(cb, function (data) {
								// calculate average after aggregation
								_.each(data, function (metric) {
									var key = metric.value;
									key.tta = key.tt/key.c;
								});
								cb(null, data);
						})
					);
				},
				getActionsCategoryTimings:function (t, p, cb) {
					var query = queryfix(p.filter);
					var name = query["data._s_name"];
					as.mapReduce(function () {
							var dt = parseInt(this._dt.valueOf()/(QUANT*60000));
							this.data.forEach(function(k) {
								if (!NAME || k._s_name == NAME) {
									emit(dt,{r: k._i_cnt, tt: k._i_tt});
								}
							});
						},
						function (k, v) {
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v;
								}
								else {
									r.r += v.r;
									r.tt += v.tt;
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1},
							scope: {NAME: name, QUANT: p.quant || 1}
						}, safe.sure(cb, function (data) {
							// calculate average after aggregation
							_.each(data, function (metric) {
								var key = metric.value;
								key.tta = key.tt/key.r;
							});
							cb(null, data);
						})
					);
				},
				getActionsCategoryBreakDown: function(t,p, cb) {
					var query = queryfix(p.filter);
					query._s_cat = "WebTransaction";
					as.mapReduce(
						function() {
							var self=this;
							this.data.forEach(function(k,v) {
								if (k._s_name == NAME) {
									emit(self._s_name, {cnt: k._i_cnt, tt: k._i_tt});
								}
							});
						},
						function (k,v) {
							var r=null;
							v.forEach(function(v) {
								if (!r) {
									r = v;
								}
								else {
									r.tt += v.tt;
									r.cnt += v.cnt;
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1},
							scope: {CAT: query._s_cat, NAME: p.filter["data._s_name"]}
						}, safe.sure(cb, function (data) {
							// calculate average after aggregation
							_.each(data, function (metric) {
								var key = metric.value;
								key.tta = key.tt/key.cnt;
							});
							cb(null, data);
						})
					);
				},
				getMetricsView:function(t,p,cb){
					var query = queryfix(p.filter);

					metrics.mapReduce(
						function(){
							emit(parseInt(this._dt.valueOf()/(Q*25000)),{mem: this._f_val/this._i_cnt});
						},
						function (k,v) {
							var r=null;
							v.forEach(function(v) {
								if (!r) {
									r = v;
								}
								else {
									r.mem = ((v.mem + r.mem)/2);
								}
							});
							return r;
						},
						{
							query: query,
							out: {inline:1},
							scope:{Q: p.quant}
						},cb);

				}
			}});
		}));
	}));
};
