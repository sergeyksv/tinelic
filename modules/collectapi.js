"use strict";
var _ = require("lodash");
var safe = require("safe");
var mongo = require("mongodb");
var crypto = require('crypto');
var moment = require("moment");
var useragent = require("useragent");
var geoip = require('geoip-lite');
var request = require('request');

var buf = new Buffer(35);
buf.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

module.exports.deps = ['mongo','prefixify'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.parallel([
			function (cb) {
				db.collection("events",safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({chash:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) },
						function (cb) { col.ensureIndex({_idpv:1}, cb) },
						function (cb) { col.ensureIndex({message:1}, cb) }
					], safe.sure(cb, col))
				}))
			},
			function (cb) {
				db.collection("pages",safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({chash:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) }
					], safe.sure(cb, col))
				}))
			},
			function (cb) {
				db.collection("ajax", safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({chash:1}, cb)},
						function (cb) { col.ensureIndex({_dt:1}, cb)},
						function (cb) { col.ensureIndex({_idp:1}, cb)}
					], safe.sure(cb, col))
				}))
			},
			function (cb) {
				db.collection("actions", cb)
			},
			function (cb) {
				db.collection("actions_stats", cb)
			}
		],safe.sure_spread(cb, function (events,pages,ajax, actions, as) {
			ctx.router.get("/ajax/:project", function (req, res, next) {
				var data = req.query;
				data._idp = new mongo.ObjectID(req.params.project);
				data._dtr = new Date();
				data._dt = data._dtr;

				var ip = req.headers['x-forwarded-for'] ||
					req.connection.remoteAddress ||
					req.socket.remoteAddress ||
					req.connection.socket.remoteAddress;

				data = prefixify(data,{strict:1});
				var md5sum = crypto.createHash('md5');
				md5sum.update(ip);
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(""+parseInt((data._dtp.valueOf()/(1000*60*60))))
				data.shash = md5sum.digest('hex');
				md5sum = crypto.createHash('md5');
				md5sum.update(ip);
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(data._dtp.toString());
				data.chash = md5sum.digest('hex');
				data.request = {};
				safe.run(function (cb) {
					pages.findAndModify(
						{
							chash: data.chash,
							_dt: {$lte: data._dt}
						}, {_dt: -1},{$inc:{_i_err: (data._code == 200)?0:1}}, {multi: false}, safe.sure(cb, function (page) {
							if (page) {
								data._idpv = page._id;
								(page.route) && (data.request.route = page.route);
								(page.uri) && (data.request.uri = page.uri);
							}
							ajax.insert(data, cb)
						}))
				}, function (err) {
					if (err)
						return console.log(err);
					res.set('Content-Type', 'image/gif');
					res.send(buf);
				})
			})
			ctx.router.get("/browser/:project",function (req, res, next) {
				var data = req.query;
				data._idp=req.params.project;
				data._dtr = new Date();
				data._dtc = data._dt;
				data._dt = data._dtr;
				data.agent = useragent.parse(req.headers['user-agent']).toJSON();
				var ip = req.headers['x-forwarded-for'] ||
					 req.connection.remoteAddress ||
					 req.socket.remoteAddress ||
					 req.connection.socket.remoteAddress;

				var geo = geoip.lookup(ip);
				if (geo)
					data.geo = JSON.parse(JSON.stringify(geo));

				data = prefixify(data,{strict:1});
				var md5sum = crypto.createHash('md5');
				md5sum.update(ip);
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(""+parseInt((data._dtp.valueOf()/(1000*60*60))))
				data.shash = md5sum.digest('hex');
				md5sum = crypto.createHash('md5');
				md5sum.update(ip);
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(data._dtp.toString());
				data.chash = md5sum.digest('hex');
				data._i_err = 0;
				data.uri = data.p
				data.route = data.r
				delete data.r
				delete data.p
				safe.run(function (cb) {
					pages.insert(data, safe.sure(cb, function (docs) {
						// once after inserting page we need to link
						// this page events that probably cread earlier
						var _id = docs[0]._id;
						safe.parallel([
							function(cb) {
								events.update({chash: data.chash, _dt:{$gte:new Date(data._dt.valueOf()-data._i_tt*2),$lte:data._dt}}, {
									$set: {
										_idpv: _id,
										request: {route: data.route, uri: data.uri}
									}
								}, {multi: true}, safe.sure(cb, function (updates) {
									if (updates)
										pages.update({_id: _id}, {$inc: {_i_err: updates}}, cb);
									else
										cb();
								}))
							},
							function(cb) {
								ajax.update({chash: data.chash, _dt:{$gte:new Date(data._dt.valueOf()-data._i_tt*2),$lte:data._dt}}, {
									$set: {
										_idpv: _id,
										request: {route: data.route, uri: data.uri}
									}
								}, {multi: true}, safe.sure(cb, function() {
									ajax.find({chash: data.chash, _code: {$ne: '200'}}).count(safe.sure(cb, function(count) {
										if (count > 0)
											pages.update({_id: _id}, {$inc: {_i_err: count}}, cb);
										else
											cb();
									}))
								}))
							}
						], cb)
					}))
				}, function (err) {
					if (err)
						return console.log(err);
					res.set('Content-Type', 'image/gif');
					res.send(buf);
				})
			})
			ctx.router.get("/sentry/api/:project/:action",function (req, res, next) {
				var ip = req.headers['x-forwarded-for'] ||
					 req.connection.remoteAddress ||
					 req.socket.remoteAddress ||
					 req.connection.socket.remoteAddress;

				var data = JSON.parse(req.query.sentry_data);
				var _dtp = data._dtp || data._dtInit;
				data.project && (delete data.project);
				data._idp = req.params.project;
				data._dtr = new Date();
				data._dtc = data._dt;
				data._dt = data._dtr;
				data._dtp = _dtp;
				data._dtInit && (delete data._dtInit);
				data.agent = useragent.parse(req.headers['user-agent'],data.request.headers['User-Agent']).toJSON();
				data = prefixify(data,{strict:1});
				var md5sum = crypto.createHash('md5');
				md5sum.update(ip);
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(""+(parseInt(data._dtp.valueOf()/(1000*60*60))))
				data.shash = md5sum.digest('hex');
				md5sum = crypto.createHash('md5');
				md5sum.update(ip);
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(data._dtp.toString());
				data.chash = md5sum.digest('hex');
				// when error happens try to link it with current page
				// which is latest page from same client (chash)
				// which is registered not later than current event
				safe.run(function (cb) {
					pages.findAndModify({chash:data.chash, _dt:{$lte:data._dt}},{_dt:-1},{$inc:{_i_err:1}},{multi:false}, safe.sure(cb, function (page) {
						if (page) {
							data._idpv = page._id;
							(page.route) && (data.request.route = page.route);
							(page.uri) && (data.request.uri = page.uri);
						}

						events.insert(data, cb)
					}))
				}, function (err) {
					if (err)
						return console.log(err);
					res.set('Content-Type', 'image/gif');
					res.send(buf);
				})
			})
			cb(null, {api:{
				getActions: function(t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					actions.mapReduce(
						"function() {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {r: 1.0/"+q+", tt: this._itt})\
						}",
						function (k,v) {
							var t = 200; //apdex T
							var f = 4*t;
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v;
									r.apdex = [(v.tt <= t) ? 1 : 0, (v.tt > t && v.tt <= f) ? 1 : 0, 1];
								}
								else {
									r.r += v.r;
									r.tt = (r.tt + v.tt)/2;
									r.apdex[0] += (v.tt <= t)?1:0;
									r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
									r.apdex[2] += 1;
								}
							})
							r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				getTopTransactions: function(t, p , cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					actions.mapReduce(
						"function() {\
							emit(this.r, {tt: this._itt*(1.0/"+q+"), tta: Number(this._itt.toFixed(3)), r: 1.0/"+q+"})\
						}",
						function (k,v) {
							var t = 0.2; //apdex T
							var f = 4*t;
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v
									r.apdex = [(v.tta <= t) ? 1 : 0, (v.tta > t && v.tta <= f) ? 1 : 0, 1];
								}
								else {
									r.tt += v.tt;
									r.tta = Number(((r.tta+v.tta)/2).toFixed(3));
									r.r += v.r
									r.apdex[0] += (v.tta <= t)?1:0;
									r.apdex[1] += (v.tta > t && v.tta <= f)?1:0;
									r.apdex[2] += 1;
								}
							})
							r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				getTopAjax: function(t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					ajax.mapReduce(
						"function() {\
							emit(this.r, {tt: this._i_tt, tta: (this._i_tt/1000).toFixed(2)})\
						}",
						function (k,v) {
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v;
									r.tta = v.tt;
								}
								else {
									r.tt += v.tt;
									r.tta = (r.tta+v.tt)/2;
								}
							})
							r.tta = (r.tta/1000).toFixed(2)
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				getTopPages: function(t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					var t = 4000; //apdex T
					var f = 4*t;
					pages.mapReduce(
						"function() {\
							emit(this.uri, {tt: this._i_tt*(1.0/"+q+"), tta: this._i_tt, r: 1.0/"+q+", apdex:(((this._i_tt <= "+t+")?1:0)+((this._i_tt>"+t+"&&this._i_tt <= "+f+")?1:0)/2)/1})\
						}",
						function (k,v) {
							var t = 4000; //apdex T
							var f = 4*t;
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v
									r.apdex = [(v.tta <= t) ? 1 : 0, (v.tta > t && v.tta <= f) ? 1 : 0, 1];
								}
								else {
									r.tt += v.tt;
									r.tta = Number(((r.tta+v.tta)/2).toFixed(3));
									r.r += v.r
									r.apdex[0] += (v.tta <= t)?1:0;
									r.apdex[1] += (v.tta > t && v.tta <= f)?1:0;
									r.apdex[2] += 1;
								}
							})
							r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				getEvents:function (t, p, cb) {
					// dummy, just get it all out
					events.find().toArray(cb)
				},
				getEvent:function (t, p, cb) {
					// dummy, just get it all out
					events.findOne({_id:new mongo.ObjectID(p._id)},cb);
				},
				getAjaxStats:function(t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					ajax.mapReduce(
						"function() {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {c:1,pt: this._i_pt,tt:this._i_tt, code: this._code, r:1.0/"+q+", e:1.0*(this._i_code != 200 ? 1:0 )/"+q+"})\
						}",
						function (k,v) {
							var t = 400; //apdex T
							var f = 4*t;
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v;
									r.apdex = [(v.tt <= t) ? 1 : 0, (v.tt > t && v.tt <= f) ? 1 : 0, 1];
								}
								else {
									r.tt = (r.tt + v.tt)/2;
									r.c+=v.c;
									r.e+=v.e;
									r.r+=v.r;
									r.pt+= v.pt;
									r.apdex[0] += (v.tt <= t)?1:0;
									r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
									r.apdex[2] += 1;
								}
							})
							r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				getPageViews:function (t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					pages.mapReduce("function () {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)),{c:1,r:1.0/"+q+",e:1.0*(this._i_err?1:0)/"+q+",tt:this._i_tt})\
						}",
						function (k, v) {
							var t = 4000; //apdex T
							var f = 4*t;
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v;
									r.apdex = [(v.tt <= t)?1:0,(v.tt > t && v.tt <= f)?1:0,1]

								}
								else {
									r.tt=(r.tt*r.c+v.tt*v.c)/(r.c+v.c);
									r.c+=v.c;
									r.e+=v.e;
									r.r+=v.r;
									r.apdex[0] += (v.tt <= t)?1:0;
									r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
									r.apdex[2] += 1;
								}
							})
							r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				getEventInfo:function (t, p, cb) {
					var query = queryfix(p.filter);

					events.findOne(query, safe.sure(cb, function (event) {
						var st = (event.stacktrace && event.stacktrace.frames && event.stacktrace.frames.length) || 0;
						var query = {_idp:event._idp,logger:event.logger,platform:event.platform,message:event.message,"stacktrace.frames":{$size:st}};

						events.mapReduce(function () {
								var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
								var route = {}; route[this.request.route]=1;
								var browser = {}; browser[this.agent.family+" "+this.agent.major]=1;
								var os = {}; os[this.agent.os.family]=1;
								var sessions = {}; sessions[this.shash]=1;
								var views = {}; views[this._idpv]=1;
								var ids = [this._id];
								emit(this.logger+this.platform+this.message+st,{c:1,route:route,browser:browser,os:os,sessions:sessions,views:views,ids:ids})
							},
							function (k, v) {
								var r=null;
								v.forEach(function (v) {
									if (!r)
										r = v
									else {
										r.ids = r.ids.concat(v.ids);
										for (var k in v.sessions) {
											r.sessions[k]=1;
										}
										for (var k in v.views) {
											r.views[k]=1;
										}
										r.c+=v.c;
										for (var k in v.route) {
											r.route[k]=(r.route[k] || 0) + v.route[k];
										}
										for (var k in v.browser) {
											r.browser[k]=(r.browser[k] || 0) + v.browser[k];
										}
										for (var k in v.os) {
											r.os[k]=(r.os[k] || 0) + v.os[k];
										}
									}
								})
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							safe.sure(cb, function (stats) {
								var res = stats[0].value;
								var res1 = {route:[],os:[],browser:[],count:res.c,sessions:_.size(res.sessions),views:_.size(res.views),ids:_.sortBy(res.ids)}
								_.each(res.route, function (v,k) {
									res1.route.push({k:k,v:v})
								})
								_.each(res.os, function (v,k) {
									res1.os.push({k:k,v:v})
								})
								_.each(res.browser, function (v,k) {
									res1.browser.push({k:k,v:v})
								})
								cb(null,res1);
							})
						)
					}))
				},
				getErrorStats:function (t, p, cb) {
					var query = queryfix(p.filter);
					events.mapReduce(function () {
							var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
							var s = {}; s[this.shash]=1;
							var epm = {}; epm[this._idpv]=1;
							emit(this.logger+this.platform+this.message+st,{c:1,s:s,_dtmax:this._dt,_dtmin:this._dt, _id:this._id,epm:epm})
						},
						function (k, v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v
								else {
									for (var k in v.s) {
										r.s[k]=1;
									}
									for (var k in v.epm) {
										r.epm[k]=1;
									}
									r.c+=v.c;
									r._dtmin = Math.min(r._dtmin, v._dtmin);
									r._dtmax = Math.min(r._dtmax, v._dtmax);
									(r._dtmax==v._dtmax) && (r._id = v._id);
								}
							})
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						safe.sure(cb, function (stats) {
							_.each(stats, function (s) {
								s.value.s = _.size(s.value.s);
								s.value.epm = _.size(s.value.epm);
							} );
							stats = _.sortBy(stats, function (s) { return -1*s.value.s*s.value.epm; } );
							var ids = {};
							_.each(stats, function (s) {
								ids[s.value._id]={stats:s.value};
							} );
							events.find(queryfix({_id:{$in:_.keys(ids)}}))
								.toArray(safe.sure(cb, function (errors) {
									_.each(errors, function (e) {
										ids[e._id].error = e;
									})
									cb(null, _.values(ids));
								}))
						})
					)
				},
				getJSByTrace:function (t, p, cb) {
					var url = p.filename.trim();

					request.get({url:url}, safe.sure(cb, function (res, body) {
						if (res.statusCode!=200)
							return cb(new Error("Error, status code " + res.statusCode));
						var lineno=0,lineidx=0;
						while (lineno<parseInt(p.lineno)-1) {
							lineidx = body.indexOf('\n',lineidx?(lineidx+1):0);
							if (lineidx==-1)
								return cb(new Error("Line number '"+p.lineno+"' is not found"));
							lineno++;
						}
						var idx = lineidx+parseInt(p.colno);
						body = body.substring(0,idx)+"_t__pos____"+body.substring(idx);
						if (idx>=body.length)
							return cb(new Error("Column number '"+p.colno+"' is not found"));
						var block = body.substring(Math.max(idx-80,0),Math.min(idx+80,body.length-1));

						return cb(null, block)
					}))
				},
				getAjaxRpm:function(t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					if (!p.Graph_bool) {
						ajax.mapReduce(
							"function() {\
								emit(this.r, { r:1.0/"+q+", dt:this._dt, tt:this._i_tt, tta: (this._i_tt/1000).toFixed(2)})\
							}",
							function (k,v) {
								var t = 400; //apdex T
								var f = 4*t;
								var r=null;
								v.forEach(function (v) {
									if (!r){
										r = v
										r.tta = v.tt;
										r.apdex = [(v.tt <= t) ? 1 : 0, (v.tt > t && v.tt <= f) ? 1 : 0, 1];
									}
									else {
										r.r+=v.r;
										r.dt=v.dt;
										r.tt = (r.tt + v.tt)/2;
										r.tta = Number((r.tta+v.tt)/2);
										r.apdex[0] += (v.tt <= t)?1:0;
										r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
										r.apdex[2] += 1;
									}
								})
								r.tta = Number((r.tta/1000).toFixed(2))
								r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							cb
						)
					}
					else {
						query.r=p._idurl;
						ajax.mapReduce(
							"function() {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {c:1, r:1.0/"+q+",tt:this._i_tt})\
							}",
							function (k,v) {
								var t = 400; //apdex T
								var f = 4*t;
								var r=null;
								v.forEach(function (v) {
									if (!r)
										r = v
									else {
										r.tt=(r.tt*r.c+v.tt*v.c)/(r.c+v.c);
										r.c+=v.c;
										r.r+=v.r;
									}
								})
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							cb
						)
					}
				},
				asBreakDown: function(t,p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					as.mapReduce(
						"function() {\
							emit(this.r, {data: this.data} )\
						}",
						function (k,v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v
								else {
									if (!r.data) {
										r.data = [];
									}
									v.data.forEach(function(data) {
										r.data.push(data)
									})
								}
							})
							var int = {}
							r.data.forEach(function(data){
								if (int[data.r]) {
									int[data.r].data[0] += data.data[0]
									int[data.r].data[1] += data.data[1]
									int[data.r].data[2] += data.data[2]
									int[data.r].data[3] += data.data[3]
									int[data.r].data[4] += data.data[4]
									int[data.r].data[5] += data.data[5]
								}
								else {
									int[data.r] = data
								}
							})
							return int;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				pagesBreakDown: function(t,p,cb){
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					pages.find(query,{_id: 1}).toArray(safe.sure(cb, function(data){
						delete query.uri
						var idpv = []
						_.forEach(data, function(r){
							idpv.push(r._id)
						})
						query._idpv = {$in: idpv}
						ajax.mapReduce(
							"function() {\
                                emit(this.r, {r: 1.0/"+q+", tt: this._i_tt} )\
                            }",
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r)
										r = v
									else {
										r.r += v.r
										r.tt = (r.tt + v.tt)/2
									}
								})
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							cb
						)
					}))
				},
				ajaxBreakDown: function(t,p,cb){
					var query = queryfix(p.filter);
					var q = p.quant || 1;
						ajax.mapReduce(
							"function() {\
                                emit(this.r, { uri: this.request.uri, pag: [], count:{}} )\
                            }",
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r)
										r = v
									else {
											r.pag.push(v.uri)
									}
							})
							return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							cb
						)
				},
				postDbViews:function (t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					as.mapReduce("function () {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)),{data: this.data})\
						}",
						function (k, v) {
							var r=null;

							v.forEach(function (v) {
								if (!r) {
									r = v
								}
								else {
									var data={}
									v.data.forEach(function(v){
										data[v.r] = v
									})
									r.data.forEach(function(r){
										if (data[r.r]) {
											r.data[0] += data[r.r].data[0]
											r.data[1] += data[r.r].data[1]
											r.data[2] += data[r.r].data[2]
											r.data[3] += data[r.r].data[3]
											r.data[4] += data[r.r].data[4]
											r.data[5] += data[r.r].data[5]
										}
									})
								}
							})
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				},
				postDbBreakdown:function (t, p, cb) {
					var query = queryfix(p.filter);
					var q = p.quant || 1;
					as.mapReduce("function () {\
							emit(this.r,{data: this.data})\
						}",
						function (k, v) {
							var r=null;

							v.forEach(function (v) {
								if (!r) {
									r = v
								}
								else {
									var data={}
									v.data.forEach(function(v){
										data[v.r] = v
									})
									r.data.forEach(function(r){
										if (data[r.r]) {
											r.data[0] += data[r.r].data[0]
											r.data[1] += data[r.r].data[1]
											r.data[2] += data[r.r].data[2]
											r.data[3] += data[r.r].data[3]
											r.data[4] += data[r.r].data[4]
											r.data[5] += data[r.r].data[5]
										}
									})
								}
							})
							return r;
						},
						{
							query: query,
							out: {inline:1}
						},
						cb
					)
				}
			}});
		}))
	}))
}
