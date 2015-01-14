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
				db.collection("sentry",cb);
			},
			function (cb) {
				db.collection("pages", cb);
			}
		], safe.sure_spread(cb, function (sentry,pages) {
			ctx.router.use("/browser/:project",function (req, res, next) {
				var data = req.query;
				data._idp=req.params.project;
				data._dtr = new Date();
				var md5sum = crypto.createHash('md5');
				md5sum.update(req.headers['host']);
				md5sum.update(req.headers['user-agent']);
				md5sum.update(data._dtp.toString());
				data.chash = md5sum.digest('hex');
				data._i_err = 0;
				data = prefixify(data);
				safe.run(function (cb) {
					pages.insert(data, safe.sure(cb, function (docs) {
						// once after inserting page we need to link
						// this page events that probably cread earlier
						var _id = docs[0]._id;
						sentry.update({chash:data.chash,_idpv:{$exists:false}},{$set:{_idpv:_id}},safe.sure(cb, function (updates) {
							if (updates)
								pages.update({_id:_id},{$inc:{_i_err:updates}},cb);
							else
								cb();
						}))
					}))
				}, function (err) {
					if (err)
						return console.log(err);
					res.send(buf, { 'Content-Type': 'image/gif' }, 200);
				})
			})
			ctx.router.use("/api/:project",function (req, res, next) {
				var data = JSON.parse(req.query.sentry_data);
				data.project && (delete data.project);
				data._idp = req.params.project;
				data = prefixify(data);
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
						sentry.insert(data, cb)
					}))
				}, function (err) {
					if (err)
						return console.log(err);
					res.send(buf, { 'Content-Type': 'image/gif' }, 200);
				})
			})
			cb(null, {api:{
				getEvents:function (t, p, cb) {
					// dummy, just get it all out
					sentry.find().toArray(cb)
				},
				getEvent:function (t, p, cb) {
					// dummy, just get it all out
					sentry.findOne({_id:new mongo.ObjectID(p._id)},cb);
				},
				getPageViews:function (t, p, cb) {
					pages.mapReduce(function () {
							emit(parseInt(this._dt.valueOf()/60000),{c:1,e:this._i_err?1:0,tt:this._i_tt})
						},
						function (k, v) {
							var r=null;
							v.forEach(function (v) {
								if (!r)
									r = v
								else {
									r.c+=v.c;
									r.e+=v.e;
									r.tt=(r.tt+v.tt)/r.c;
								}
							})
							return r;
						},
						{
							out: {inline:1},
						},
						cb
					)
				}
			}});
		}))
	}))
}
