/**
 * Created by ivan on 2/16/15.
 */
var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")

module.exports.deps = ['mongo','obac'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;

	ctx.api.obac.register(['team_view','team_edit'],'teams',{permission:'getTeamPermission',grantids:'getGrantedTeamIds'});
	ctx.api.obac.register(['project_view','project_edit'],'teams',{permission:'getProjectPermission',grantids:'getGrantedProjectIds'});

    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.series({
            "teams":function (cb) {
                db.collection("teams",cb);
            },
            "projects":function (cb) {
                db.collection("projects",cb);
            }
        }, safe.sure(cb,function (tm) {
            cb(null, {api:{
				getTeamPermission:function (t, p, cb) {
					ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
						if (p.action == "team_view")
							tm.teams.findOne({'users._idu':u._id}, safe.sure(cb, function (user) {
								cb(null,!!user);
							}))
						else if (p.action == "team_edit")
							tm.teams.findOne(queryfix({users:{$elemMatch:{_idu:u._id,role:"lead"}}}), safe.sure(cb, function (user) {
								cb(null,!!user);
							}))
						else
							cb(null, [])
					}))
				},
				getProjectPermission:function (t, p, cb) {
					ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
						if (p.action == "project_view")
							tm.teams.findOne(queryfix({'users._idu':u._id,"projects._idp":p._id}), safe.sure(cb, function (user) {
								cb(null,!!user);
							}))
						else if (p.action == "project_edit")
							tm.teams.findOne(queryfix({'users':{$elemMatch:{_idu:u._id,role:"lead"},"projects._idp":p._id}}), safe.sure(cb, function (user) {
								cb(null,!!user);
							}))
						else
							cb(null, []);
					}))
				},
				getGrantedTeamIds:function (t, p, cb) {
					ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
						var filter = {};
						if (u.role!="admin") {
							if (p.action == "team_edit")
								filter['users']={$elemMatch:{_idu:u._id,role:"lead"}}
							else
								filter['users._idu']=u._id;

						}
						tm.teams.find(filter,{_id:1}).toArray(safe.sure(cb, function (teams) {
							cb(null,_.pluck(teams, "_id"));
						}))
					}))
				},
				getGrantedProjectIds:function (t, p, cb) {
					var relmap = {project_edit:"team_edit",project_view:"team_view"};
					ctx.api.obac.getGrantedIds(t,{action:relmap[p.action]}, safe.sure(cb, function (teamids) {
						tm.teams.find(queryfix({_id:{$in:teamids}})).toArray(safe.sure(cb, function (teams) {
							var projectids = _.reduce(teams, function (res,v) {
								_.each(v.projects, function (project) {
									res[project._idp]=1;
								})
								return res;
							},{});
							cb(null,_.keys(projectids));
						}))
					}))
				},
                getTeam: function (t,u,cb) {
                    // t = "public",u = {filter:{name:"DefaultUser"}}
                    tm.teams.findOne(u.filter, cb);
                },
                getTeams: function (t,u,cb) {
                    ctx.api.obac.getGrantedIds(t,{action:"team_view"}, safe.sure(cb,function(ids) {
                        tm.teams.find(queryfix({_id:{$in:ids}})).toArray(cb)
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
