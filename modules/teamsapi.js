/**
 * Created by ivan on 2/16/15.
 */
var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")

module.exports.deps = ['mongo'];

module.exports.init = function (ctx, cb) {
    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.series({
            "teams":function (cb) {
                db.collection("teams",cb);
            }
        }, safe.sure(cb,function (tm) {
            cb(null, {api:{
                getTeam: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    tm.teams.findOne(u.filter, cb);
                },
                getTeams: function (t,u,cb) {
                    ctx.api.users.getCurrentUser(t, safe.sure(cb, function(u) {
                        if (u[0].role == 'admin' ) {
                            tm.teams.find({}).sort({name: 1}).toArray(cb)
                        }
                        else {
                            var id = u[0]._id
                            tm.teams.find({"users._idu": id.toString()}).toArray(cb)
                        }
                    }))
                },
                saveTeam: function (t,u,cb) {
                    // t = "public", u = {name:"DefaultUser", pass:'123'}
                    tm.teams.insert(u, cb);
                },
                updateTeam: function (t,u,cb) {
                    var _id = new mongo.ObjectID(u.id)
                    tm.teams.update({_id: _id},
                        { $set: {
                                name: u.name
                            }
                        }
                        ,{}, cb);
                },
                removeTeam: function(t,u,cb) {
                    var _id = new mongo.ObjectID(u.id)
                    tm.teams.remove({_id: _id}, cb)
                },
                addProjects: function(t, u, cb) {
                    var _id = new mongo.ObjectID(u.id);
                    tm.teams.update({_id: _id}, {
                        $addToSet: {
                            projects: {$each: u.projects}
                        }}, {},
                        cb)
                },
                addUsers: function(t, u , cb) {
                    var _id = new mongo.ObjectID(u.id);
                    tm.teams.update({_id: _id}, {
                            $addToSet: {
                                    users: {$each:u.users}
                            }}, {},
                        cb)
                },
                pullData: function(t, u, cb) {
                    var _id = new mongo.ObjectID(u.id)
                    if (u.idt == '_idu') {
                        tm.teams.update({_id: _id}, {$pull: {users: {_idu: u.idtt}}},{}, cb)
                    }
                    else {
                        tm.teams.update({_id: _id}, {$pull: {projects: {_idp: u.idtt}}},{}, cb)
                    }
                }
            }});
        }))
    }))
}
