"use strict";
var _ = require("lodash");
var safe = require("safe");
var mongo = require("mongodb");
var crypto = require('crypto');
var moment = require("moment");
var useragent = require("useragent");
var geoip = require('geoip-lite');
var request = require('request');
var zlib = require('zlib');
var ErrorParser_GetsentryServer = require("./error_parser/parser_getsentry_server.js");
var ErrorParser_Newrelic = require( "./error_parser/parser_newrelic.js" );

var buf = new Buffer(35);
buf.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

module.exports.deps = ['mongo','prefixify','validate','assets'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;
	ctx.api.validate.register("error", {$set:{properties:{
		_dt:{type:"date",required:true},
		_idp:{type:"mongoId",required:true},
		_id:{type:"mongoId"}
	}}})
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.parallel([
			function (cb) {
				db.collection("page_errors",safe.sure(cb, function (col) {
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
				db.collection("page_reqs", safe.sure(cb, function (col) {
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
				db.collection("action_stats", cb)
			},
			function (cb) {
				db.collection("action_errors", cb)
			},
			function (cb) {
				db.collection("metrics", cb)
			}
		],safe.sure_spread(cb, function (events,pages,ajax, actions, as, action_errors, metrics) {
			ctx.express.post("/agent_listener/invoke_raw_method", function( req, res, next ) {
				function nrParseTransactionName( value ) {
					var _value_array = value.split( "/" );
					var _type = _value_array.length > 1 ? _value_array[0] + "/" + _value_array[1] : ""
						, _name = "";
					for( var i = 2; i < _value_array.length; i++ )
						_name += (_name.length > 0 ? "/" : "") + _value_array[i];
					return { name: _name.length ? _name : "-unknown-", type: _type.length ? _type : "-unknown-" };
				}
				function nrNonFatal(err) {
					// capture NewRelic errors with GetSentry, cool to be doublec backed up
					if (err) {
						if (ctx.locals && ctx.locals.ravenjs)
							ctx.locals.ravenjs.captureError(err);
						else
							console.log(err);
					}
				}
				safe.run(function (cb) {
					var nrpc = {
						get_redirect_host:function () {
							// agent ask for reporting host, return by ourselves
							var _host_arr = req.headers.host.split( ":" );
							res.json( { return_value: _host_arr[0] } );
						},
						connect:function () {
							// on connect we should link agent with its project id when available
							var body = req.body[0];
							var agent_name = body.app_name[0];
							ctx.api.assets.getProject("public", {name:agent_name}, safe.sure(cb, function (project) {
								if (!project)
									throw new Error( "Project \"" + agent_name + "\" not found" );

								var run = {_idp:project._id, _s_pid:body.pid, _s_logger:body.language, _s_host:body.host};
								res.json({return_value:{"agent_run_id": new Buffer(JSON.stringify(run)).toString('base64')}});
							}))
						},
						agent_settings:function () {
							// seems to be hook to alter agent settings
							// not supported now, just mirror back
							res.json(req.body)
						},
						metric_data:function () {
							var body = req.body;
							var run = prefixify(JSON.parse(new Buffer(req.query.run_id, 'base64').toString('utf8')));

							var _dts = new Date( body[1] * 1000.0 )
								, _dte = new Date( body[2] * 1000.0 )
								, _dt = new Date( (_dts.getTime() + _dte.getTime()) / 2.0 );

							var action_stats = {};
							_.each(body[body.length-1], function (item) {
								// grab memory metrics
								if (item[0].name == "Memory/Physical") {
									metrics.insert({
										_idp: run._idp
										, "_dt": _dt
										, "_dts": _dts
										, "_dte": _dte
										, "_s_type": item[0].name
										, "_s_name": ""
										, "_s_pid": run._s_pid
										, "_s_host": run._s_host
										, _i_cnt: item[1][0]
										, _f_val: item[1][1]
										, _f_own: item[1][2]
										, _f_min: item[1][3]
										, _f_max: item[1][4]
										, _f_sqr: item[1][5]
									}, nrNonFatal)
								}
								// grab transaction segments stats
								var scope = item[0]["scope"];
								if (!scope) return;

								var trnScope = nrParseTransactionName(scope)
								var trnName = nrParseTransactionName(item[0]["name"])

								if( !action_stats[scope] ) {
									action_stats[scope] = {
										"_idp": run._idp
										, "_s_name": trnScope.name
										, "_s_type": trnScope.type
										, "_dt": _dt
										, "_dts": _dts
										, "_dte": _dte
										, data: []
									}
								}
								action_stats[scope].data.push( {
									_s_name: trnName.name,
									_s_type: trnName.type,
									_i_cnt: item[1][0],
									_i_tt: Math.round(item[1][1]*1000),
									_i_own: Math.round(item[1][2]*1000),
									_i_min: Math.round(item[1][3]*1000),
									_i_max: Math.round(item[1][4]*1000),
									_i_sqr: Math.round(item[1][5]*1000)
								})
							})
							if (_.size(action_stats)) {
								as.insert( _.values(action_stats), nrNonFatal)
							}
							res.json( { return_value: "ok" } );
						},
						analytic_event_data:function () {
							var body = req.body;
							var run = prefixify(JSON.parse(new Buffer(req.query.run_id, 'base64').toString('utf8')));

							_.each(body[body.length - 1], function (item) {
								item = item[0];
								var trnName = nrParseTransactionName(item["name"]);
								actions.insert({
									"_idp": run._idp
									, "_s_name": trnName.name
									, "_s_type": trnName.type
									, "_dt": new Date(item["timestamp"] )
									, "_i_wt": Math.round(item["webDuration"]*1000)
									, "_i_tt": Math.round(item["duration"]*1000)
								}, nrNonFatal);
							})
							res.json( { return_value: "ok" } );
						},
						error_data:function () {
							var body = req.body;
							var run = prefixify(JSON.parse(new Buffer(req.query.run_id, 'base64').toString('utf8')));

							var error_parser = new ErrorParser_Newrelic();
							error_parser.add_error(run, body[body.length - 1], safe.sure( nrNonFatal, function( error_data ) {
								action_errors.insert( error_data, nrNonFatal)
							}));
							res.json( { return_value: "ok" } );
						}
					}
					var fn = nrpc[req.query.method];
					if (!fn)
						throw new Error("NewRelic: unknown method " + req.query.method)
					fn();
				}, function (err) {
					nrNonFatal(err)
					res.json({exception:{message:err.message}});
				})
			})
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
				data._s_name = data.r
				data._s_url = data.url
				delete data.url
				delete data.r
				safe.run(function (cb) {
					pages.findAndModify(
						{
							chash: data.chash,
							_dt: {$lte: data._dt}
						}, {_dt: -1},{$inc:{_i_err: (data._code == 200)?0:1}}, {multi: false}, safe.sure(cb, function (page) {
							if (page) {
								data._idpv = page._id;
								(page._s_route) && (data._s_route = page._s_route);
								(page._s_uri) && (data._s_uri = page._s_uri);
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
				data._s_uri = data.p
				data._s_route = data.r
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
										request: {
											route: data._s_route,
											uri: data._s_uri
										}
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
										_s_route: data._s_route,
										_s_uri: data._s_uri}
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
			// dsn is like http://auth1:auth2@{host}/collect/sentry/{projectid}
			ctx.router.post( "/sentry/api/store", function( req, res, next ) {
				safe.run(function(cb) {
					var zip_buffer = new Buffer( req.body.toString(), 'base64' );
					zlib.inflate( zip_buffer, safe.sure( cb, function( _buffer_getsentry_data ) {
						var getsentry_data = JSON.parse( _buffer_getsentry_data.toString() );
						var error_parser = new ErrorParser_GetsentryServer();
						error_parser.add_error( db, new mongo.ObjectID(getsentry_data.project.toString()),
							getsentry_data, safe.sure( cb, function( error_data ) {
								action_errors.insert( error_data, cb)
							})
						);
					}));
				}, function( error ){
					if (error) {
						// report getsentry error with newrelic ;)
						newrelic.noticeError(error);
						res.writeHead( 500, { 'x-sentry-error': error.toString() } );
						res.status(500).end( error.toString() );
					} else {
						res.status(200).end( "ok" );
					}
				});
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
				data._s_culprit = data.culprit; delete data.culprit;
				data._s_message = data.message; delete data.message;
				data._s_id = data.event_id; delete data.event_id;
				data._s_logger = data.logger; delete data.logger;
				data.exception._s_type = data.exception.type; delete data.exception.type;
				data.exception._s_value = data.exception.value; delete data.exception.value;
				_.forEach(data.stacktrace.frames, function(r) {
					r._s_file = r.filename; delete r.filename;
					r._i_line = r.lineno; delete r.lineno;
					r._i_col = r.colno; delete r.colno;
					r._s_func = r.function; delete r.function;
					r._b_inapp = r.in_app; delete r.in_app;
				})
				delete data.platform;

				safe.run(function (cb) {
					pages.findAndModify({chash:data.chash, _dt:{$lte:data._dt}},{_dt:-1},{$inc:{_i_err:1}},{multi:false}, safe.sure(cb, function (page) {
						if (page) {
							data._idpv = page._id;
							(page._s_route) && (data.request.route = page._s_route);
							(page._s_uri) && (data.request.uri = page._s_uri);
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
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {r: 1.0/"+q+", tt: this._i_tt})\
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
							emit(this._s_name, {tt: this._i_tt*(1.0/"+q+"), tta: this._i_tt, r: 1.0/"+q+"})\
						}",
						function (k,v) {
							var t = 200; //apdex T
							var f = 4*t;
							var r=null;
							v.forEach(function (v) {
								if (!r) {
									r = v
									r.apdex = [(v.tta <= t) ? 1 : 0, (v.tta > t && v.tta <= f) ? 1 : 0, 1];
								}
								else {
									r.tt += v.tt;
									r.tta = parseInt(((r.tta+v.tta)/2));
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
							emit(this._s_name, {tt: this._i_tt, tta: (this._i_tt/1000).toFixed(2)})\
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
							emit(this._s_uri, {tt: this._i_tt*(1.0/"+q+"), tta: this._i_tt, r: 1.0/"+q+", apdex:(((this._i_tt <= "+t+")?1:0)+((this._i_tt>"+t+"&&this._i_tt <= "+f+")?1:0)/2)/1})\
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
						var query = {_idp:event._idp,_s_logger:event._s_logger,_s_message:event._s_message,"stacktrace.frames":{$size:st}};

						events.mapReduce(function () {
								var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
								var route = {}; route[this.request.route]=1;
								var browser = {}; browser[this.agent.family+" "+this.agent.major]=1;
								var os = {}; os[this.agent.os.family]=1;
								var sessions = {}; sessions[this.shash]=1;
								var views = {}; views[this._idpv]=1;
								var ids = [this._id];
								emit(this._s_logger+this._s_message+st,{c:1,route:route,browser:browser,os:os,sessions:sessions,views:views,ids:ids})
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
							emit(this._s_logger+this._s_message+st,{c:1,s:s,_dtmax:this._dt,_dtmin:this._dt, _id:this._id,epm:epm})
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
					var url = p._s_file.trim();

					request.get({url:url}, safe.sure(cb, function (res, body) {
						if (res.statusCode!=200)
							return cb(new Error("Error, status code " + res.statusCode));
						var lineno=0,lineidx=0;
						while (lineno<parseInt(p._i_line)-1) {
							lineidx = body.indexOf('\n',lineidx?(lineidx+1):0);
							if (lineidx==-1)
								return cb(new Error("Line number '"+p._i_line+"' is not found"));
							lineno++;
						}
						var idx = lineidx+parseInt(p._i_col);
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
								emit(this._s_name, { r:1.0/"+q+", dt:this._dt, tt:this._i_tt, tta: (this._i_tt/1000).toFixed(2)})\
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
						query._s_name=p._idurl;
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
							emit(this._s_name, {data: this.data} )\
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
								if (int[data._s_name]) {
									int[data._s_name]._i_cnt += data._i_cnt
									int[data._s_name]._i_tt += data._i_tt
									int[data._s_name]._i_own += data._i_own
									int[data._s_name]._i_min += data._i_min
									int[data._s_name]._i_max += data._i_max
									int[data._s_name]._i_sqr += data._i_sqr
								}
								else {
									int[data._s_name] = data
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
						delete query._s_uri
						var idpv = []
						_.forEach(data, function(r){
							idpv.push(r._id)
						})
						query._idpv = {$in: idpv}
						ajax.mapReduce(
							"function() {\
                                emit(this._s_name, {r: 1.0/"+q+", tt: this._i_tt} )\
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
                                emit(this._s_name, { uri: this._s_uri, pag: [], count:{}} )\
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
										data[v._s_name] = v
									})
									r.data.forEach(function(r){
										if (data[r._s_name]) {
											r._i_cnt += data[r._s_name]._i_cnt
											r._i_tt += data[r._s_name]._i_tt
											r._i_own += data[r._s_name]._i_own
											r._i_min += data[r._s_name]._i_min
											r._i_max += data[r._s_name]._i_max
											r._i_sqr += data[r._s_name]._i_sqr
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
							emit(this._s_name,{data: this.data})\
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
										data[v._s_name] = v
									})
									r.data.forEach(function(r){
										if (data[r._s_name]) {
											r._i_cnt += data[r._s_name]._i_cnt
											r._i_tt += data[r._s_name]._i_tt
											r._i_own += data[r._s_name]._i_own
											r._i_min += data[r._s_name]._i_min
											r._i_max += data[r._s_name]._i_max
											r._i_sqr += data[r._s_name]._i_sqr
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
