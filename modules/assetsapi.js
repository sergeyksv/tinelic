/*jslint node: true */
var _ = require("lodash");
var safe = require("safe");
var mongo = require("mongodb");
var projIdCache = {};

module.exports.deps = ['mongo','obac'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;

	ctx.api.obac.register(['team_view','team_edit'],'assets',{permission:'getTeamPermission',grantids:'getGrantedTeamIds'});
	ctx.api.obac.register(['project_view','project_edit','project_new'],'assets',{permission:'getProjectPermission',grantids:'getGrantedProjectIds'});

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
	}}});

	ctx.api.validate.register("project", {$set:{properties:{
		_id:{type:"mongoId"},
		name:{type:"string",required:true},
		slug:{type:"string",required:true},
		apdexConfig:{type:"object", required:false, properties:{
			_i_serverT:{type:"integer",required:true},
			_i_ajaxT:{type:"integer",required:true},
			_i_pagesT:{type:"integer",required:true},
		}}
	}}});

    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.series({
            "teams":function (cb) {
                db.collection("teams",cb);
            },
            "projects":function (cb) {
                db.collection("projects",safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { ctx.api.mongo.ensureIndex(col,{slug:1}, cb); }
					], safe.sure(cb, col));
				}));
            }
        }, safe.sure(cb,function (tm) {
			var projects = tm.projects;
            cb(null, {

/**
* REST API to manage system assets (teams and projects)
*
* @exports AssetsApi
*/
api:{

/**
* @param {String} token Auth token
* @param {String} projNameOrID project name or a compound name of the project ({team ID}-{project name}) or project ID
* @return {String} _id - project id
*/
ensureProjectId: function (t, projNameOrID, cb){
	if (projNameOrID in projIdCache)
		return safe.back(cb, null, projIdCache[projNameOrID]);
	safe.run(function (cb) {
			var tmpQuery = {_id: projNameOrID};
			if (!(_.isEmpty(queryfix(tmpQuery))))
	 			tmpQuery = queryfix(tmpQuery);
			projects.find(tmpQuery).toArray(safe.sure(cb, function (p1) {
				if (p1.length == 0) {
					if (projNameOrID[24] == '-'){
	  				var at = projNameOrID.substr(0, 24)
	  				var an = projNameOrID.substr(25, projNameOrID.length-1);
		 				if (!an)
			 				return cb(new Error( "The project name cannot be empty!" ));
		 				ctx.api.assets.getProject(ctx.locals.systoken, {filter:{name: an}}, safe.sure(cb, function (project) {
			 				if (!project) {
								ctx.api.assets.getTeam(ctx.locals.systoken, {filter:{_id: at}}, safe.sure(cb, function (team) {
					 				if (!team) {
					 					return cb(new Error( "_id Team \"" + at + "\" not found" ));
									}else{
										var tmpProj=team.projects;
										ctx.api.assets.saveProject(ctx.locals.systoken, {project: {name: an}}, safe.sure(cb, function (proj) {
							 				if (!tmpProj)
							 					tmpProj = [];
							 				tmpProj.push({_idp: proj._id});
							 				ctx.api.assets.saveTeamProjects(ctx.locals.systoken, {_id: at, projects: tmpProj}, safe.sure(cb, function () {}));
							 				cb(null, proj._id);
										}));
									};
				 				}));
			 				}else{
				 				ctx.api.assets.getProject(ctx.locals.systoken, {filter:{name: an}}, safe.sure(cb, function (project) {
									cb(null, project._id);
								}));
			 				};
		 				}));
	 				}else{
	  				ctx.api.assets.getProject(ctx.locals.systoken, {filter:{name: projNameOrID}}, safe.sure(cb, function (project) {
							cb(null, project._id);
						}));
	 				};
				}else{
					cb(null, projNameOrID);
				};
  		}));
	},
	safe.sure(cb, function (res){
		projIdCache[projNameOrID] = res;
		cb(null, res);
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Team id
* @param {('team_view'|'team_edit')} action
* @return {Boolean} result Allow or disallow
*/
getTeamPermission:function (t, p, cb) {
	ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
		if (p.action == "team_view")
			tm.teams.findOne({'users._idu':u._id,_id:p._id}, safe.sure(cb, function (user) {
				cb(null,!!user);
			}));
		else if (p.action == "team_edit")
			tm.teams.findOne(queryfix({users:{$elemMatch:{_idu:u._id,role:"lead"}},_id:p._id}), safe.sure(cb, function (user) {
				cb(null,!!user);
			}));
		else
			cb(null, []);
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Project id
* @param {('project_view'|'project_edit')} action
* @return {Boolean} result Allow or disallow
*/
getProjectPermission:function (t, p, cb) {
	ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
		if (p.action == "project_view")
			tm.teams.findOne(queryfix({'users._idu':u._id,"projects._idp":p._id}), safe.sure(cb, function (user) {
				cb(null,!!user);
			}));
		else if (p.action == "project_edit")
			tm.teams.findOne(queryfix({'users':{$elemMatch:{_idu:u._id,role:"lead"}},"projects._idp":p._id}), safe.sure(cb, function (user) {
				cb(null,!!user);
			}));
		else if (p.action == "project_new")
			tm.teams.findOne(queryfix({'users':{$elemMatch:{_idu:u._id,role:"lead"}}}), safe.sure(cb, function (user) {
				cb(null,!!user);
			}));
		else
			cb(null, []);
	}));
},

/**
* @param {String} token Auth token
* @param {('team_view'|'team_edit')} action
* @return {String[]} All granted teams ids
*/
getGrantedTeamIds:function (t, p, cb) {
	ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
		var filter = {};
		if (u.role!="admin") {
			if (p.action == "team_edit")
				filter.users={$elemMatch:{_idu:u._id,role:"lead"}};
			else
				filter['users._idu']=u._id;

		}
		tm.teams.find(filter,{_id:1}).toArray(safe.sure(cb, function (teams) {
			cb(null,_.pluck(teams, "_id"));
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {('project_view'|'project_edit')} action
* @return {String[]} All granted project ids
*/
getGrantedProjectIds:function (t, p, cb) {
	ctx.api.users.getCurrentUser(t, safe.sure(cb, function (u) {
		var relmap = {project_edit:"team_edit",project_view:"team_view"};
		if (u.role!="admin") {
			ctx.api.obac.getGrantedIds(t,{action:relmap[p.action]}, safe.sure(cb, function (teamids) {
				tm.teams.find(queryfix({_id:{$in:teamids}})).toArray(safe.sure(cb, function (teams) {
					var projectids = _.reduce(teams, function (res,v) {
						_.each(v.projects, function (project) {
							res[project._idp]=1;
						});
						return res;
					},{});
					cb(null,_.keys(projectids));
				}));
			}));
		} else {
			// admin can see all
			tm.projects.find({},{_id:1}).toArray(safe.sure(cb, function (projects) {
				cb(null,_.pluck(projects, "_id"));
			}));
		}
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter agains project
* @return {Project[]}
*/
getProjects:function (t, p, cb) {
	ctx.api.obac.getGrantedIds(t,{action:"project_view"}, safe.sure(cb,function(ids) {
		var idsmap = {};
		_.each(ids, function (id) {
			idsmap[id]=1;
		});
		var res = [];
		projects.find(queryfix(p.filter)).toArray(safe.sure(cb, function (projects) {
			_.each(projects, function (p) {
				if (idsmap[p._id])
					res.push(p);
			});
			cb(null, res);
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter agains project
* @return {Project}
*/
getProject:function (t, p, cb) {
	projects.findOne(queryfix(p.filter),safe.sure(cb, function (p) {
		if (!p)	return cb(null,null);
		ctx.api.obac.getPermission(t,{_id:p._id, action:"project_view",throw:1}, safe.sure(cb, p));
	}));
},

/**
* @param {String} token Auth token
* @param {Project} project New or updated project
* @return {Project}
*/
saveProject:function (t, p, cb) {
	var project = prefixify(p.project);
	ctx.api.obac.getPermission(t,{action:p.project._id?'project_edit':'project_new',_id:p.project._id,throw:1}, safe.sure(cb, function () {
		var id = project._id || new mongo.ObjectID();
		var data = _.pick(project,["name"]); // for now we can only update name, how smart :)
		ctx.api.validate.check("project", data, {isUpdate:true}, safe.sure(cb, function () {
			if (data.name)
				data.slug = data.name.toLowerCase().replace(" ","-");
			projects.findAndModify({_id:id}, {}, {$set:data}, {upsert:true,new:true}, safe.sure(cb, function (obj) {
				cb(null, obj);
			}));
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter agains teams
* @return {Project}
*/
getTeam: function (t,p,cb) {
    tm.teams.findOne(prefixify(p.filter), safe.sure(cb, function (team) {
		if (!team)
			return cb(null,null);
		ctx.api.obac.getPermission(t,{_id:team._id, action:"team_view",throw:1}, safe.sure(cb, team));
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter agains teams
* @return {Project}
*/
getTeams: function (t,p,cb) {
	ctx.api.obac.getGrantedIds(t,{action:"team_view"}, safe.sure(cb,function(ids) {
		var idsmap = {};
		_.each(ids, function (id) {
			idsmap[id]=1;
		});
		var res = [];
		tm.teams.find(queryfix(p.filter)).toArray(safe.sure(cb, function (teams) {
			_.each(teams, function (p) {
				if (idsmap[p._id])
					res.push(p);
			});
			cb(null, res);
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Team} team New or updated team
* @return {Team}
*/
saveTeam: function (t,p,cb) {
	var team = prefixify(p.team);
	ctx.api.obac.getPermission(t,{action:p.team._id?'team_edit':'team_new',_id:p.team._id,throw:1}, safe.sure(cb, function () {
		var id = team._id || new mongo.ObjectID();
		var data = _.pick(team,["name"]); // for now we can only update name, how smart :)
		ctx.api.validate.check("team", data, {isUpdate:true}, safe.sure(cb, function () {
			tm.teams.findAndModify({_id:id}, {}, {$set:data}, {upsert:true,new:true}, safe.sure(cb, function (obj) {
				cb(null, obj);
			}));
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Team id to delete
*/
removeTeam: function(t,p,cb) {
	p =  prefixify(p);
	ctx.api.obac.getPermission(t,{action:'team_edit',_id:p._id,throw:1}, safe.sure(cb, function () {
    	tm.teams.remove({_id: p._id}, cb);
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Team id to delete
* @param {Array<{idp:mongoid}>} projects Team projects
*/
saveTeamProjects: function(t,p,cb) {
	p = prefixify(p);
	ctx.api.obac.getPermission(t,{action:'team_edit',_id:p._id,throw:1}, safe.sure(cb, function () {
		var data = {projects: p.projects};
		ctx.api.validate.check("team", data, {isUpdate:true}, safe.sure(cb, function () {
			tm.teams.update({_id: p._id},{$set: data}, cb);
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Team id
* @param {('lead'|'member')} _s_type User type
* @param {Array<{_idu:mongoid}>} users Team users
*/
saveTeamUsersForRole: function(t, u, cb) {
	u = prefixify(u);
	ctx.api.obac.getPermission(t,{action:'team_edit',_id:u._id,throw:1}, safe.sure(cb, function () {
		_.each(u.users,function (user) {
			user.role = u._s_type;
		});
		var update = {
			$addToSet: {
					users: {$each:u.users}
			}
		};
		tm.teams.update({_id: u._id},{$pull:{users:{role: u._s_type}}},{},safe.sure(cb,function() {
			if (!(u.users && u.users.length))
				return cb(null);
			ctx.api.validate.check("team", update, {isUpdate:true}, safe.sure(cb, function () {
				tm.teams.update({_id: u._id}, update, {},cb);
			}));
		}));
	}));
},


/**
* Notify system that project state for specific date was acknowledged
* @param {String} token Auth token
* @param {String} _id Project id
* @param {('_dtPagesErrAck'|'_dtActionsErrAck')} Array or one type
*/
ackProjectState: function(t, data, cb) {
	data = prefixify(data);
	ctx.api.obac.getPermission(t,{action:'project_edit',_id:data._id,throw:1}, safe.sure(cb, function () {
		var set = {};

		var types = _.isArray(data.type)?data.type:[data.type];
		_.each(types,function(t) {
			set[t] = new Date();
		});

		tm.projects.update({_id: data._id}, {$set:set}, cb);
	}));
},


/**
* @param {String} token Auth token
* @param {String} _id Project id
* @param {Object} Apdex config
*/
getProjectApdexConfig: function(t, p, cb) {
	p =  prefixify(p);
	ctx.api.obac.getPermission(t,{action:'project_view',_id:p._id,throw:1}, safe.sure(cb, function () {
		projects.findOne(p, safe.sure(cb,function(data) {
			if (data && data.apdexConfig)
				cb(null,data.apdexConfig);
			else
				cb(null, {
					_i_serverT: 200,
					_i_pagesT: 7000,
					_i_ajaxT: 500
				});
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Project id
* @return {Object[]} Page rules
*/
getProjectPageRules: function(t,p,cb) {
	p = prefixify(p);
	ctx.api.obac.getPermission(t,{action:'project_view',_id:p._id,throw:1}, safe.sure(cb, function () {
		projects.findOne(p,safe.sure(cb,function(data){
			cb(null,data.pageRules || []);
		}));
	}));
},


/**
* @param {String} token Auth token
* @param {String} _id Project id
* @param {Object} rule Project rule
*/
savePageRule: function(t,p,cb) {
	p = prefixify(p);
	ctx.api.obac.getPermission(t,{action:'project_edit',_id:p._id,throw:1}, safe.sure(cb, function () {
		// ensure that every rule has an id
		_.each(p.rule.actions, function (action) {
			if (!action._id)
				action._id = mongo.ObjectID();
		});
		if (p.rule._id) {
			// update existins
			projects.update({_id: p._id,'pageRules._id': p.rule._id},{$set: {'pageRules.$':p.rule}},{multi:false},cb);
		} else {
			// add new one
			p.rule._id = mongo.ObjectID();
			projects.update({_id: p._id},{$push: {pageRules:p.rule}},{},cb);
		}
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Project id
* @param {Object} apdexConfig Apdex config
*/
saveApdexT: function(t,p,cb){
	p = prefixify(p);
	ctx.api.obac.getPermission(t,{action:'project_edit',_id:p._id,throw:1}, safe.sure(cb, function () {
		ctx.api.validate.check("team", p, {isUpdate:true}, safe.sure(cb, function () {
			projects.update({_id: p._id},{$set:p},{},cb);
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Project id
* @param {Object} filter Mongo filter against page rules
*/
deletePageRule: function(t,p,cb){
	p = prefixify(p);
	ctx.api.obac.getPermission(t,{action:'project_edit',_id:p._id,throw:1}, safe.sure(cb, function () {
		projects.update({_id: p._id},{$pull:{pageRules:p.filter}},{},cb);
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id Project id
*/
deleteProject: function(t,p,cb){
	p = prefixify(p);
	ctx.api.obac.getPermission(t,{action:'project_edit',_id:p._id,throw:1}, safe.sure(cb, function () {
		var collections = ['action_errors','action_stats','actions','metrics','page_errors','page_reqs','pages'];
		safe.parallel([
			function(cb){
				safe.forEach(collections,function(collection,eachCb){
					db.collection(collection,safe.sure(eachCb,function(thisCollection){
						thisCollection.remove({_idp: p._id},eachCb);
					}));
				},cb);
			},
			function(cb){
				tm.projects.remove({_id: p._id},cb);
			},
			function(cb){
				tm.teams.update({'projects._idp': p._id},{$pull:{projects: {_idp:p._id}} },{multi:true},cb);
			}
		],cb);
	}));
}

}});
}));
}));
};
