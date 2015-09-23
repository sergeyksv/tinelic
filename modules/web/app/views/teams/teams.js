define(['require','tinybone/base',"tinybone/backadapter","safe",'lodash','dustc!views/teams/teams.dust'],function (require,tb, api, safe,_) {
    var view = tb.View;
    var View = view.extend({
        id:"views/teams/teams",
        events: {
            "click .doEditProjects":function(e){
                e.preventDefault();
                var self = this;
                var $this = $(e.currentTarget);
                var id = $this.data('id');
                var team = _.find(this.data.teams, function (team) { return team._id==id;});
                var $anchor = $this.closest('p');
                var $current = $anchor;
                require(["views/teams/tagsedit"],function(TagsEdit){
                    var p = new TagsEdit({app:self.app});
                    p.data = {current:[],variants:[]};
                    _.each(team.projects, function (project) {
                        p.data.current.push({value:project._t_project._id, text:project._t_project.name});
                    });
                    _.each(self.data.proj, function (project) {
                        p.data.variants.push({value:project._id, text:project.name});
                    });
                    p.locals = {};
                    p.render(safe.sure(self.app.errHandler,function(text){
                        var $p = $(text);
                        $anchor.after($p);
						$current.hide();
                        p.bindDom($p);
                    }));
                    p.on('cancel',function () {
						$current.show();
						p.remove();
					});
                    p.on('save',function(projects) {
                        var data = {projects:[],_id:id};
                        _.each(projects,function(r){
                            data.projects.push({_idp:r.value});
                        });

                        api("assets.saveTeamProjects",$.cookie('token'), data, safe.sure(this.app.errHandler, function (data) {
                            api.invalidate();
                            self.app.router.reload();
                        }));
                    });
                },this.app.errHandler);
                return false;
            },
            "click .doEditUsers":function(e){
                e.preventDefault();
                var self = this;
                var $this = $(e.currentTarget);
                var id = $this.data('id');
                var role = $this.data('role');
                var team = _.find(this.data.teams, function (team) { return team._id==id;});
                var $anchor = $this.closest('p');
                var $current = $anchor;
                require(["views/teams/tagsedit"],function(TagsEdit){
                    var p = new TagsEdit({app:self.app});
                    p.data = {current:[],variants:[]};
                    _.each(team.users, function (user) {
                        if (user.role==role)
                            p.data.current.push({value:user._idu, text:user.firstname + ' ' + user.lastname});
                    });
                    _.each(self.data.usr, function (user) {
                        p.data.variants.push({value:user._id, text:user.firstname + ' ' + user.lastname});
                    });
                    p.locals = {};
                    p.render(safe.sure(self.app.errHandler,function(text){
                        var $p = $(text);
                        $anchor.after($p);
						$current.hide();
                        p.bindDom($p);
                    }));
                    p.on('cancel',function () {
						$current.show();
						p.remove();
					});
                    p.on('save',function(users) {
                        var data = {_id:id,_s_type:role,users:[]};
                        _.each(users,function(r){
                            data.users.push({_idu:r.value});
                        });

                        api("assets.saveTeamUsersForRole",$.cookie('token'), data, safe.sure(this.app.errHandler, function (data) {
                            api.invalidate();
                            self.app.router.reload();
                        }));
                    });
                },this.app.errHandler);
                return false;
            },
            'click .doNewProject': function(e) {
                e.preventDefault();
                var self = this;
                require(["views/modals/project"],function (Modal) {
                    var modal = new Modal({app:self.app});
                    modal.data = {};
                    modal.render(safe.sure(self.app.errHandler, function (text) {
                        var $modal = $(text);
                        self.$el.prepend($modal);
                        modal.bindDom($modal);
                    }));
                    modal.once("saved", function () {
                        api.invalidate();
                        self.app.router.reload();
                    });
                }, this.app.errHandler);
                return false;
            },
            'click .doEditTeam':function(e) {
                e.preventDefault();
                var self = this;
                var $this = $(e.currentTarget);
                var id = $this.data('id');
                var team = _.find(this.data.teams, function (team) { return team._id==id;});
                require(["views/teams/teamedit"],function (Modal) {
                    var modal = new Modal({app:self.app});
                    modal.data = team || {};
                    modal.render(safe.sure(self.app.errHandler, function (text) {
                        var $modal = $(text);
                        self.$el.prepend($modal);
                        modal.bindDom($modal);
                    }));
                    modal.once("saved", function (name) {
                        api.invalidate();
                        self.app.router.reload();
                    });
                }, this.app.errHandler);
                return false;
            },
            'click #delete':function (e) {
                e.preventDefault();
                var self = this;
                $this = $(e.currentTarget);
                self.app.confirm('This will destroy team permanently. Are you sure?',function(){
                    api("assets.removeTeam",$.cookie('token'), {_id: $this.data('delete')}, safe.sure(self.app.errHandler, function () {
                        api.invalidate();
                        self.app.router.reload();
                    }));
                });
                return false;
            }
    }});
    View.id = "views/teams/teams";
    return View;
});
