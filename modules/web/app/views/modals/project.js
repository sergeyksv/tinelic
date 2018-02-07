define(['tinybone/base','bootstrap/modal','tinybone/backadapter','safe', 'lodash','bootstrap/typeahead','bootstrap/tagsinput','bootstrap/dropdown', 'dustc!views/modals/project.dust'],function (tb,modal,api,safe,_) {
	var view = tb.View;
	var View = view.extend({
		id:"views/modals/project",
		postRender:function () {
			var self = this;
			api("assets.getTeams", $.cookie('token'),{},safe.sure(this.app.errHandler, function(teams){
				teams = _.filter(teams, function(r){
					var bool = false;
					_.each(r.users,function(u){
						if (u.role == 'lead')
							bool = true;
					});
					return bool;
				});

				if (teams.length) {
					var tags = self.$('.tags');
					self.$el.modal({});

					var teamnames = [];
					_.each(teams, function(team){
						teamnames.push({name:team.name});
						if (team._id == self.data._id || self.data._id == undefined) {
						tags.append('<option data-teamid="'+team._id+'" selected="selected" value="'+team.name+'">'+team.name+'</option>');
						}
					});
					var tnames = new Bloodhound({
						local: teamnames,
						datumTokenizer: function(d) {
							return Bloodhound.tokenizers.whitespace(d.name);
						},
						queryTokenizer: Bloodhound.tokenizers.whitespace
					});
					tnames.initialize();

					tags.tagsinput({
						typeaheadjs: {
							name: 'teamnames',
							displayKey: 'name',
							valueKey: 'name',
							source: tnames.ttAdapter()
						}
					});
				}
				else
					alert('Not have Team with Lead');

			}));
		},
		events:{
			"click .do-close":function (e) {
				e.preventDefault();
				this.remove();
		},
		remove: function () {
			self.$('.modal').modal('hide');
			return view.prototype.remove.call(this);
		},
		"click .do-save":function (e) {
			var self = this;
			var checkTeam = self.$('select').val();
			if (checkTeam) {
				e.preventDefault();
				var project = {
					name:this.$("#name").val()
				};
				var tags = _.reduce($('option[data-teamid]'),function(memo,i){
					memo[$(i).val()] = $(i).data('teamid');
					return memo;
				},{});
				var data = {_id:[],projects:[]};
				_.each(checkTeam,function(k){
					if (tags[k])
						data._id.push(tags[k]);
				});

				if (data._id.length) {
					safe.auto({
						saveProject: function (cb) {
							api("assets.saveProject", $.cookie('token'), {project: project}, cb);
						},
						team: function (cb) {
							api("assets.getTeam", $.cookie('token'), {filter:{_id:data._id[0]}}, cb);
						},
						saveIntoTeams:['saveProject','team',function(cb,result) {
							result.team.projects.push({_idp: result.saveProject._id});
							api('assets.saveTeamProjects', $.cookie('token'), {_id:data._id[0],projects:result.team.projects}, cb);
						}]
					},safe.sure(this.app.errHandler, function () {
						api.invalidate();
						self.remove();
						self.trigger("saved");
						window.location.reload();
					}));
				}
				else
					self.$('#warn').html('Teams not found');
			}
			else
				self.$('#warn').html('Team is not checked');
		}}
	});
	View.id = "views/modals/project";
	return View;
});
