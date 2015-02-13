var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")
var CustomError = require('tinyback').CustomError

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
                getCurrentUser: function (t,cb) {
                    usr.users.find({'tokens.token' : t }).toArray(safe.sure(cb, function(n){
                        if (n.length)
                            cb(null, n)
                        else
                            throw new CustomError('This is a guest',"Login required")
                    }))
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
                },
                signUp:function(t,u,cb) {
                    var dt = new Date()
                    var range = 7 * 24 * 60 * 60 * 1000;
                    var dtexp = new Date(Date.parse(Date()) + range);

                    usr.users.findAndModify(
                        {login: u.login, pass: u.pass},{},{
                           $push: {tokens:{token: Math.random().toString(36).slice(-14),_dt: dt,_dtexp: dtexp}}
                           },{new: true, fields: {tokens: 1}}, safe.sure(cb, function(t) {
                              cb(null, t.tokens[t.tokens.length-1].token)
                        })
                    )
                }
            }});
        }))
    }))
}
