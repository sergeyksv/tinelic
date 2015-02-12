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
                },
                updateUser: function (t,u,cb) {
                    var _id = new mongo.ObjectID(u.id)
                    usr.users.update({_id: _id},
                        {
                            firstname: u.firstname,
                            lastname: u.lastname,
                            login: u.login,
                            pass: u.pass
                        }
                        ,{}, cb);
                },
                removeUser: function(t,u,cb) {
                    var _id = new mongo.ObjectID(u.id)
                    usr.users.remove({_id: _id}, cb)
                }
            }});
        }))
    }))
}
