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
	var token=null;

	ctx.api.obac.register(['team_view','team_edit'],'assets',{permission:'getTeamPermission',grantids:'getGrantedTeamIds'});
	ctx.api.obac.register(['project_view','project_edit'],'assets',{permission:'getProjectPermission',grantids:'getGrantedProjectIds'});

	ctx.api.validate.register("team", {$set:{properties:{
		_id:{type:"mongoId"},
		name:{type:"string",required:true},
		projects:{type:"array", items:[
			{type:"object", properties:{
				_idp:{type:"mongoId", required:true}
			}}
		]}
	}}})

    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.series({
            "teams":function (cb) {
                db.collection("teams",cb);
            },
            "projects":function (cb) {
                db.collection("projects",cb);
            }
        }, safe.sure(cb,function (tm) {
			var projects = tm.projects;
            cb(null, {api:{
				getTeamPermission:function (t, p, cb) {
					token=t
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
				getProjects:function (t, p, cb) {
                    ctx.api.obac.getGrantedIds(t,{action:"project_view"}, safe.sure(cb,function(ids) {
                        projects.find(queryfix({_id:{$in:ids}})).toArray(cb)
                    }))
				},
				getProject:function (t, p, cb) {
					p.filter._id && (p.filter._id =  mongo.ObjectID(p._id));
					projects.findOne(p.filter,cb);
				},
				saveProject:function (t, p, cb) {
					var id = new mongo.ObjectID(p.project._id); delete(p.project._id);
					p.project.name && (p.project.slug = p.project.name.toLowerCase().replace(" ","-"))
					projects.update({_id:id}, {$set:p.project}, {upsert:true,fullResult:true}, safe.sure(cb, function (obj) {
						cb(null, id, p.project.name, p.project.slug)
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
					ctx.api.assets.getProjects(token,{}, safe.sure(cb, function (v) {
						for(var i=0; i<u.projects.length; i++){
							v.forEach(function(v){
								if (v._id == u.projects[0]._idp){
									u.projects[i]._idp=v._id;
									u.projects[i].name=v.name;
									u.projects[i].slug=v.slug;
								}
							})
						}
						var _id = new mongo.ObjectID(u.id);
						tm.teams.update({_id: _id}, {
							$addToSet: {
								projects: {$each: u.projects}
							}}, {},
                        cb)
					}))
                },
                addUsers: function(t, u , cb) {
					ctx.api.users.getUsers(token,{}, safe.sure(cb, function (v) {
						for(var i=0; i<u.users.length; i++){
							v.forEach(function(v){
								if (v._id == u.users[i]._idu){
									u.users[i]._idu=v._id
								}
							})
						}
						var _id = new mongo.ObjectID(u.id);
						tm.teams.update({_id: _id}, {
                            $addToSet: {
                                    users: {$each:u.users}
                            }}, {},
                        cb)
					}))
                },
                pullData: function(t, u, cb) {
                    var _id = new mongo.ObjectID(u.id)
                    var idtt = new mongo.ObjectID(u.idtt)
                    if (u.idt == '_idu') {
                        tm.teams.update({_id: _id}, {$pull: {users: {_idu: idtt}}},{}, cb)
                    }
                    else {
                        tm.teams.update({_id: _id}, {$pull: {projects: {_idp: idtt}}},{}, cb)
                    }
                }
            }});
        }))
    }))
}
