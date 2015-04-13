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

	ctx.api.obac.register(['team_view','team_edit'],'assets',{permission:'getTeamPermission',grantids:'getGrantedTeamIds'});
	ctx.api.obac.register(['project_view','project_edit'],'assets',{permission:'getProjectPermission',grantids:'getGrantedProjectIds'});

	ctx.api.validate.register("team", {$set:{properties:{
		_id:{type:"mongoId"},
		name:{type:"string",required:true},
		projects:{type:"array", items:{
			type:"object", required:false, properties:{
				_idp:{type:"mongoId"}
			}
		}},
		users:{type:"array", items:{
			type:"object", required:false, properties:{
				_idu:{required:true, type:"mongoId"},
				role:{required:true, enum: [ "member", "lead"]}
			}
		}}
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
							tm.teams.findOne(queryfix({'users':{$elemMatch:{_idu:u._id,role:"lead"}},"projects._idp":p._id}), safe.sure(cb, function (user) {
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
					ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
						var relmap = {project_edit:"team_edit",project_view:"team_view"};
						if (u.role!="admin") {
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
						} else {
							// admin can see all
							tm.projects.find({},{_id:1}).toArray(safe.sure(cb, function (projects) {
								cb(null,_.pluck(projects, "_id"));
							}))
						}
					}))
				},
				getProjects:function (t, p, cb) {
                    ctx.api.obac.getGrantedIds(t,{action:"project_view"}, safe.sure(cb,function(ids) {
                        projects.find(queryfix({_id:{$in:ids}})).toArray(cb)
                    }))
				},
				getProject:function (t, p, cb) {
					projects.findOne(queryfix(p.filter),cb);
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
					u = prefixify(u);
                    ctx.api.validate.check("team", u, safe.sure(cb, function (u) {
						tm.teams.insert(u, cb);
					}))
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
					u = prefixify(u);
					var update = {
							$addToSet: {
								projects: {$each: u.projects}
							}}
					ctx.api.validate.check("team", update, {isUpdate:true}, safe.sure(cb, function () {
						tm.teams.update({_id: u._id}, update, {},cb)
					}))
                },
                addUsers: function(t, u, cb) {
					u = prefixify(u);
					var update = {
						$addToSet: {
								users: {$each:u.users}
						}
					}
					ctx.api.validate.check("team", update, {isUpdate:true}, safe.sure(cb, function () {
						tm.teams.update({_id: u._id}, update, {},cb)
					}))
                },
                pullData: function(t, u, cb) {
					u = prefixify(u);
                    var update = u.idt == '_idu' ? {$pull: {users: {_idu: u._idtt}}} : {$pull: {projects: {_idp: u._idtt}}};

					ctx.api.validate.check("team", update, {isUpdate:true}, safe.sure(cb, function () {
                        tm.teams.update({_id: u._id}, update,{}, cb)
                    }))
                },
				pullErrAck: function(t, data, cb) {
					data = prefixify(data)
					var set = {$set:{}}
					set.$set[data.type] = new Date();
					tm.projects.update({_id:data._id},set,cb)
				},
				getProjectApdexConfig: function(t, query, cb) {
					query =  prefixify(query)
					var serverT = 200;
					var pagesT = 7000;
					var ajaxT = 500;
					projects.findOne(query, safe.sure(cb,function(data) {
						if (data.apdexConfig){
							cb(null,data.apdexConfig)
						}
						else {
							cb(null, {
								_i_serverT: serverT,
								_i_pagesT: pagesT,
								_i_ajaxT: ajaxT
							})
						}
					}))
				},
				saveProjectsConfig: function(t,query, cb) {
					query = prefixify(query)
					projects.update({_id: query._id},{$set:query.filter},{multi:false},cb)
				}
            }});
        }))
    }))
}
