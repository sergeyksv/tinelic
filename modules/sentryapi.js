var _ = require("lodash")
var safe = require("safe")

var buf = new Buffer(35);
buf.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

module.exports.deps = ['mongo'];

module.exports.init = function (ctx, cb) {
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		db.collection("sentry", safe.sure(cb, function (sentry) {
			ctx.router.use("/api",function (req, res, next) {
				sentry.insert(JSON.parse(req.query.sentry_data), function (err) {
					console.log(err)
				})
				res.send(buf, { 'Content-Type': 'image/gif' }, 200);
			})
			cb(null, {api:{}});
		}))
	}))
}
