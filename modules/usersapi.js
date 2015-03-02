var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")
var CustomError = require('tinyback').CustomError

module.exports.deps = ['mongo','obac'];

module.exports.init = function (ctx, cb) {
	ctx.api.obac.register(['user_new','user_edit','*'],'users','getPermission');

    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.series({
            "users":function (cb) {
                db.collection("users",cb)
            }
        }, safe.sure(cb,function (usr) {
            cb(null, {api:{
				getPermission:function (t, p, cb) {
					this.getCurrentUser(t, safe.sure(cb, function (u) {
						// admin can do everything
						if (u.role == "admin")
							return cb(null, true)
						// owner can create new user
						if (u.role == "owner" && p.action == "user_new")
							return cb(null, true)
						// user can edit and view himself
						if (u._id == p._id && p.action == "user_view" || p.action == "user_edit")
							return cb(null, true)
						// for rest we don't care
						else
							cb(null, null)
					}))
				},
                getUser: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    usr.users.findOne(u.filter, cb);
                },
                getUsers: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    this.getCurrentUser(t, safe.sure(cb, function(u) {
                        if (u.role == "admin") {
                            usr.users.find({}).sort({name: 1}).toArray(cb);
                        }
                        else {
                            throw new CustomError('You are not admin',"Access forbidden")
                        }
                    }))

                },
                getCurrentUser: function (t,cb) {
                    usr.users.findOne({'tokens.token' : t }, safe.sure(cb, function(user){
						if (!user)
                            return cb(new CustomError('Current user is unknown',"Unauthorized"));
						cb(null, user)
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
                            role: u.role,
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
                },
                userLogout: function(t, u, cb) {
                    usr.users.update({'tokens.token':u.token}, { $pull: {tokens: { token: u.token } } },{},cb);
                }
            }});
        }))
    }))
}
