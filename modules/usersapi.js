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
        }, safe.sure(cb,function (usr) {
            ctx.router.post("/", function (req, res, next) {
                var data = req.body;
                if (data.opts) {
                    var _id = new mongo.ObjectID(data.id)
                    usr.users.remove({_id: _id})
                }
                if (data.id.length != 0 && !data.opts) {
                    var _id = new mongo.ObjectID(data.id)
                    usr.users.update({_id: _id}, {
                        firstname: data.firstname,
                        lastname: data.lastname,
                        login: data.login,
                        pass: data.pass}, {})
                }
                if (data.id.length == 0) {
                    usr.users.insert({
                            firstname: data.firstname,
                            lastname: data.lastname,
                            login: data.login,
                            pass: data.pass
                        })
                }
                res.send();
            })
            cb(null, {api:{
                getUser: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    usr.users.findOne(u.filter, cb);
                },
                getUsers: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    usr.users.find({}).sort({name: 1}).toArray(cb);
                },
                saveUser: function (t,u,cb) {
                    // t = "public", u = {name:"DefaultUser", pass:'123'}
                    usr.users.insert(u, cb);
                }
            }});
        }))
    }))
}
