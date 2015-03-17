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

module.exports.deps = ['mongo','prefixify','validate'];

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
			}
		],safe.sure_spread(cb, function (events,pages,ajax) {
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
		}))
	}),cb(null, {api:{}}))
}
