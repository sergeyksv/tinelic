var _ = require("lodash")
var safe = require("safe")
var mongo = require("mongodb")

module.exports.deps = ['mongo'];

module.exports.init = function (ctx, cb) {
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.series({
			"projects":function (cb) {
				db.collection("projects",cb)
			}
		}, safe.sure(cb,function (res) {
			var projects = res.projects;
			cb(null, {api:{
				getProjects:function (t, p, cb) {
					ctx.api.users.getCurrentUser(t, safe.sure(cb, function(u) {
						if (u.role == 'admin')
							projects.find().toArray(cb)
						else {
							var proj = [];
							ctx.api.teams.getTeams(t, {}, safe.sure(cb, function(teams) {
								_.forEach(teams, function(team) {
									_.forEach(team.projects, function (project) {
										proj.push(new mongo.ObjectID(project._idp))
									})
								})
								projects.find({"_id": {$in: proj}}).toArray(cb)
							}))
						}
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
						cb(null, id)
					}))
				}
			}});
		}))
	}))
}
