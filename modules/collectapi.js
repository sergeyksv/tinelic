var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")
var crypto = require('crypto')

var buf = new Buffer(35);
buf.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

module.exports.deps = ['mongo','prefixify'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.parallel([
			function (cb) {
				db.collection("events",safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { col.ensureIndex({_dt:1}, cb) },
						function (cb) { col.ensureIndex({chash:1}, cb) },
						function (cb) { col.ensureIndex({_idp:1}, cb) },
						function (cb) { col.ensureIndex({_idpv:1}, cb) }
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
			}
		], safe.sure_spread(cb, function (events,pages) {
			ctx.router.get("/browser/:project",function (req, res, next) {
				var data = req.query;
				data._idp=req.params.project;
				data._dtr = new Date();
				data._dtc = data._dt;
				data._dt = data._dtr;
				var md5sum = crypto.createHash('md5');
				data = prefixify(data,{strict:1});
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(data._dtp.toString());
				data.chash = md5sum.digest('hex');
				data._i_err = 0;
				safe.run(function (cb) {
					pages.insert(data, safe.sure(cb, function (docs) {
						// once after inserting page we need to link
						// this page events that probably cread earlier
						var _id = docs[0]._id;
						events.update({chash:data.chash,_idpv:{$exists:false}},{$set:{_idpv:_id}},safe.sure(cb, function (updates) {
							if (updates)
								pages.update({_id:_id},{$inc:{_i_err:updates}},cb);
							else
								cb();
						}))
					}))
				}, function (err) {
					if (err)
						return console.log(err);
					res.set('Content-Type', 'image/gif');
					res.send(buf);
				})
			})
			ctx.router.get("/sentry/api/:project/:action",function (req, res, next) {
				var data = JSON.parse(req.query.sentry_data);
				data.project && (delete data.project);
				data._idp = req.params.project;
				data._dtr = new Date();
				data._dtc = data._dt;
				data._dt = data._dtr;
				data = prefixify(data,{strict:1});
				var md5sum = crypto.createHash('md5');
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(data._dtInit.toString());
				data.chash = md5sum.digest('hex');
				// when error happens try to link it with current page
				// which is latest page from same client (chash)
				// which is registered not later than current event
				safe.run(function (cb) {
					pages.findAndModify({chash:data.chash, _dt:{$lte:data._dt}},{_dt:-1},{$inc:{_i_err:1}},{multi:false}, safe.sure(cb, function (page) {
						page && (data._idpv = page._id);
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
				getEvents:function (t, p, cb) {
					// dummy, just get it all out
					events.find().toArray(cb)
				},
				getEvent:function (t, p, cb) {
					// dummy, just get it all out
					events.findOne({_id:new mongo.ObjectID(p._id)},cb);
				},
				getPageViews:function (t, p, cb) {
					var q = p.quant || 1;
					pages.mapReduce("function () {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)),{c:1,r:1.0/"+q+",e:1.0*(this._i_err?1:0)/"+q+",tt:this._i_tt})\
						}",
						function (k, v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v
								else {
									r.tt=(r.tt*r.c+v.tt*v.c)/(r.c+v.c);
									r.c+=v.c;
									r.e+=v.e;
									r.r+=v.r;
								}
							})
							return r;
						},
						{
							query: prefixify(p.filter),
							out: {inline:1},
						},
						cb
					)
				},
				getErrorStats:function (t, p, cb) {
					events.mapReduce(function () {
							var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
							emit(this.logger+this.platform+this.message+st,{c:1,_dtmax:this._dt,_dtmin:this._dt, _id:this._id})
						},
						function (k, v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v
								else {
									r.c+=v.c;
									r._dtmin = Math.min(r._dtmin, v._dtmin);
									r._dtmax = Math.min(r._dtmax, v._dtmax);
									(r._dtmax==v._dtmax) && (r._id = v._id);
								}
							})
							return r;
						},
						{
							query: prefixify(p.filter),
							out: {inline:1},
						},
						safe.sure(cb, function (stats) {
							stats = _.sortBy(stats, function (s) { return -1*s.value.c; } );
							var ids = {};
							_.each(stats, function (s) { ids[s.value._id]={stats:s.value}; } );
							events.find({_id:{$in:_.map(_.keys(ids),function (id) { return new mongo.ObjectID(id)})}})
								.toArray(safe.sure(cb, function (errors) {
									_.each(errors, function (e) {
										ids[e._id].error = e;
									})
									cb(null, _.values(ids));
								}))
						})
					)
				}
			}});
		}))
	}))
}
