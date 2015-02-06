var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")

module.exports.deps = ['mongo'];

module.exports.init = function (ctx, cb) {
    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.series({
            "users":function (cb) {
                db.collection("users",cb)
            }
        }, safe.sure(cb,function (res) {
            cb(null, {api:{
                getUser: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    res.users.findOne(u.filter, cb);
                },
                saveUser: function (t,u,cb) {
                    // t = "public", u = {name:"DefaultUser", pass:'123'}
                    res.users.insert(u, cb);
                }
            }});
        }))
    }))
}
