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
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    tm.teams.find({}).sort({name: 1}).toArray(cb);
                },
                saveTeam: function (t,u,cb) {
                    // t = "public", u = {name:"DefaultUser", pass:'123'}
                    tm.teams.insert(u, cb);
                },
                updateTeam: function (t,u,cb) {
                    var _id = new mongo.ObjectID(u.id)
                    tm.teams.update({_id: _id},
                        {
                            name: u.name
                        }
                        ,{}, cb);
                },
                removeTeam: function(t,u,cb) {
                    var _id = new mongo.ObjectID(u.id)
                    tm.teams.remove({_id: _id}, cb)
                }
            }});
        }))
    }))
}
