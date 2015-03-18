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
var newrelic = require("newrelic");

var buf = new Buffer(35);
buf.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

module.exports.deps = ['mongo','prefixify','validate','assets'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;
    ctx.api.validate.register("error", {$set:{properties:{
        _dt:{type:"date",required:true},
        _idp:{type:"mongoId",required:true},
        _id:{type:"mongoId"},
        _s_reporter:{type:"string",required:true,"maxLength": 64},
        _s_server:{type:"string",required:true,"maxLength": 256},
        _s_logger:{type:"string",required:true,"maxLength": 54},
        _s_message:{type:"string",required:true,"maxLength": 4096},
        _s_culprit:{type:"string",required:true,"maxLength": 1024},
        exception:{type:"object",required:true, properties: {
			_s_type:{type:"string", required:true,"maxLength": 64},
			_s_value:{type:"string", required:true,"maxLength": 4096}
		}},
        action:{type:"object",properties: {
			_s_type:{type:"string", required:true,"maxLength": 64},
			_s_name:{type:"string", required:true,"maxLength": 1024}
		}},
		stacktrace:{type:"object",required:true, properties: {
			frames:{type:"array",items:{
				type:"object", required:true, properties: {
					_i_col:{type:"integer",required:true},
					_i_line:{type:"integer",required:true},
					_s_file:{type:"string",requred:true,"maxLength": 1024},
					_s_func:{type:"string",requred:true,"maxLength": 256},
					_s_context:{type:"string",requred:true,"maxLength": 4096},
					pre_context:{type:"array",required:true, items:{
						type:"string",required:true,"maxLength": 4096
					}},
					post_context:{type:"array",required:true, items:{
						type:"string",required:true,"maxLength": 4096
					}}
				}
			}}
		}},
		// client side related data
        _dtc:{type:"date"},
        _dtp:{type:"date"},
        _dtr:{type:"date"},
        agent:{type:"object"},
        chash:{type:"string","maxLength": 256},
        shash:{type:"string","maxLength": 256},
        _idpv:{type:"mongoId"},
        request:{type:"object",properties: {
			_s_route:{type:"string","maxLength": 1024},
			_s_uri:{type:"string", "maxLength": 4096},
			_s_url:{type:"string", "maxLength": 4096},
			headers:{type:"object", patternProperties:{
				".*":{type:"string","maxLength": 1024}
			}}
		}},
		geo:{type:"object"}
    }}})
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.parallel([
			function (cb) {
				db.collection("page_errors",safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({chash:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) }
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
				db.collection("actions", safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) }
					], safe.sure(cb, col))
				}))
			},
			function (cb) {
				db.collection("action_stats", safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) }
					], safe.sure(cb, col))
				}))
			},
			function (cb) {
				db.collection("action_errors", safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) }
					], safe.sure(cb, col))
				}))
			},
			function (cb) {
				db.collection("metrics", safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) }
					], safe.sure(cb, col))
				}))
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

							_.each(body[body.length - 1], function (ne) {
								var trnName = nrParseTransactionName(ne[1]);
								var te = {
									_idp:run._idp,
									_dt: new Date(),
									_s_reporter: "newrelic",
									_s_server: run._s_host,
									_s_logger: run._s_logger,
									_s_message: "",
									_s_culprit: ne[1],
									exception: {
										_s_type: ne[3],
										_s_value: ne[2]
									},
									action: {
										_s_name: trnName.name,
										_s_type: trnName.type
									},
									stacktrace: { frames: [] }
								}

								_.each(ne[4]["stack_trace"][0].split("\n"), function (line) {
									var si = {pre_context:[],post_context:[],_s_context:"",_s_func:"",_s_file:"",_i_col:0,_i_line:0};
									var _TOKEN = "at ";
									if( line.indexOf( _TOKEN ) >= 0 ) {
										console.log(line);
										line = line.substr( line.indexOf( _TOKEN ) + _TOKEN.length );
										_TOKEN = "(";
										if( line.indexOf( _TOKEN ) >= 0 ) {
											si["_s_func"] = line.substr( 0, line.indexOf( _TOKEN ) ).trim();
											line = line.substr( line.indexOf( _TOKEN ) + _TOKEN.length );
											_TOKEN = ":";
											if( line.indexOf( _TOKEN ) >= 0 ) {
												si["_s_file"] = line.substr( 0, line.indexOf( _TOKEN ) ).trim();
												line = line.substr( line.indexOf( _TOKEN ) + _TOKEN.length );
												// line number and column number
												line = line.replace( ")", "" );
												var arr_line_items = line.split( ":" );
												if( arr_line_items.length == 2 ) {
													si["_i_line"] = arr_line_items[0];
													si["_i_col"] = arr_line_items[1];
												} else if( arr_line_items.length == 1 ) {
													si["_i_line"] = arr_line_items[0];
												}
											}
										}
										te.stacktrace.frames.push(si)
									} else {
										te._s_message = line;
									}
								})
								ctx.api.validate.check("error",te, safe.sure(nrNonFatal, function () {
									action_errors.insert( te, nrNonFatal)
								}))
							})

							res.json( { return_value: "ok" } );
						},
						transaction_sample_data:function () {
							// ???? transaction trace, not suppored now
							res.json( { return_value: "ok" } );
						},
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
					if (err) {
						newrelic.noticeError(err);
					}
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
											_s_route: data._s_route,
											_s_uri: data._s_uri
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
					if (err) {
						newrelic.noticeError(err);
					}
					res.set('Content-Type', 'image/gif');
					res.send(buf);
				})
			})
			// dsn is like http://auth1:auth2@{host}/collect/sentry/{projectid}
			ctx.router.post( "/sentry/api/store", function( req, res, next ) {
				safe.run(function(cb) {
					var zip_buffer = new Buffer( req.body.toString(), 'base64' );
					zlib.inflate( zip_buffer, safe.sure( cb, function( _buffer_getsentry_data ) {
						var ge = JSON.parse( _buffer_getsentry_data.toString() );

						var te = {
							_idp:new mongo.ObjectID(ge.project),
							_dt: new Date(ge.timestamp),
							_s_reporter: "raven",
							_s_server: ge.server_name,
							_s_logger: ge.platform,
							_s_message: ge.message,
							_s_culprit: ge.culprit,
							exception: {
								_s_type: ge.exception[0].type,
								_s_value: ge.exception[0].value
							},
							stacktrace: { frames: [] }
						}

						if (ge.exception[0].stacktrace) {
							_.each(ge.exception[0].stacktrace.frames, function (frame) {
								te.stacktrace.frames.push({
									_s_file: frame["filename"] || "",
									_i_line: frame["lineno"] || 0,
									_i_col: 0,
									_s_func: frame["function"] || "",
									pre_context : frame["pre_context"] || [],
									_s_context : frame["context_line"] || "",
									post_context : frame["post_context"] || []
								})
							})
						}
						ctx.api.validate.check("error",te, safe.sure(cb, function () {
							action_errors.insert( te, cb)
						}))
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
				delete data.event_id;
				data._s_logger = data.logger; delete data.logger;
				data._s_server = "rum";
				data._s_reporter = "raven";

				data.exception._s_type = data.exception.type; delete data.exception.type;
				data.exception._s_value = data.exception.value; delete data.exception.value;
				_.forEach(data.stacktrace.frames, function(r) {
					r._s_file = r.filename; delete r.filename;
					r._i_line = r.lineno; delete r.lineno;
					r._i_col = r.colno; delete r.colno;
					r._s_func = r.function; delete r.function;
					r.pre_context = [];
					r.post_context = [];
					r._s_context = "";
					delete r.in_app;
				})
				delete data.platform;
				if (data.request && data.request.url) {
					data.request._s_url=data.request.url;
					delete data.request.url;
				}

				safe.run(function (cb) {
					pages.findAndModify({chash:data.chash, _dt:{$lte:data._dt}},{_dt:-1},{$inc:{_i_err:1}},{multi:false}, safe.sure(cb, function (page) {
						if (page) {
							data._idpv = page._id;
							(page._s_route) && (data.request._s_route = page._s_route);
							(page._s_uri) && (data.request._s_uri = page._s_uri);
						}
						ctx.api.validate.check("error",data, safe.sure(cb, function () {
							events.insert(data, cb)
						}))
					}))
				}, function (err) {
					if (err) {
						newrelic.noticeError(err);
					}
					res.set('Content-Type', 'image/gif');
					res.send(buf);
				})
			})
		}))
	}),cb(null, {api:{}}))
}
