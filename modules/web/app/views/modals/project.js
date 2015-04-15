define(['tinybone/base','bootstrap/modal','tinybone/backadapter','safe', 'lodash', 'dustc!templates/modals/project.dust'],function (tb,modal,api,safe,_) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/modals/project",
		postRender:function () {
			var self = this;
			api("assets.getTeams", $.cookie('token'),{},safe.sure(this.app.errHandler, function(teams){
				teams = _.filter(teams, function(r){
					var bool = false;
					_.each(r.users,function(u){
						if (u.role == 'lead')
							bool = true
					})
					return bool
				})

				if (teams.length) {
					view.prototype.postRender.call(this);
					self.$('.modal').modal({});

					_.each(teams, function(team){
						self.$('#teamsWithLead').append('\
						<div class="checkbox">\
							<label>\
								<input type="checkbox" class="checkTeam" data-teamid="'+team._id+'"> '+team.name+'\
							</label>\
						</div>\
					')
					})
				}
				else
					alert('Not have Team with Lead')

			}))
		},
		events:{
			"click .do-close":function (e) {
				e.preventDefault();
				this.remove();
			},
			"click .do-save":"doSave",
			"submit form":"doSave"
		},
		doSave:function (e) {
			var self = this;
			var checkTeam = self.$('.checkTeam:checked')
			if (checkTeam.length) {
				e.preventDefault();
				var project = {
					name:this.$("#name").val()
				}
				var data = {_id:[],projects:[]};
				_.each(checkTeam,function(k){
					data._id.push($(k).data('teamid'))
				})
				safe.auto({
					saveProject: function (cb) {
						api("assets.saveProject", "public", {project: project}, cb)
					},
					saveIntoTeams:['saveProject',function(cb,result) {
						data.projects.push({_idp: result.saveProject});
						api('assets.addProjects', "public", data, cb)
					}]
			},safe.sure(this.app.errHandler, function () {
					 api.invalidate();
					 self.remove();
					 self.trigger("saved");
				}))
			}
			else
				self.$('#warn').html('Team is not checked')
		}
	})
	View.id = "views/modals/project";
	return View;
})
