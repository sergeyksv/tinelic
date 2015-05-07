/**
 * Created by ivan on 2/16/15.
 */
define(['tinybone/base',"tinybone/backadapter","safe",'lodash','bootstrap/typeahead','bootstrap/tagsinput','dustc!views/teams/teams.dust','bootstrap/modal'],function (tb, api, safe,_) {
    var view = tb.View;
    var View = view.extend({
        id:"views/teams/teams",
        postRender:function(){
            var self = this;
            var usersPanel = self.$('.usersPanel');
            var projectsPanel = self.$('.projectsPanel');

            var users = [];
            _.each(self.data.usr,function(k){
                users.push({fname: k.firstname +" "+ k.lastname})
            });

            var pnames = new Bloodhound({
                local: self.data.proj,
                datumTokenizer: function(d) {
                    return Bloodhound.tokenizers.whitespace(d.name)
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace
            });
            var unames = new Bloodhound({
                local: users,
                datumTokenizer: function(d) {
                    return Bloodhound.tokenizers.whitespace(d.fname);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace
            });

            pnames.initialize();
            unames.initialize();

            projectsPanel.find('.project-tags').tagsinput({
                typeaheadjs: {
                    displayKey: 'name',
                    valueKey: 'name',
                    source: pnames.ttAdapter()
                }
            })

            usersPanel.find('.tags').tagsinput({
                typeaheadjs: {
                    displayKey: 'fname',
                    valueKey: 'fname',
                    source: unames.ttAdapter()
                }
            });
            usersPanel.find('.bootstrap-tagsinput').hide();
            projectsPanel.find('.bootstrap-tagsinput').hide();
        },
        events: {
            //'click .doUpdate':"doUpdate",
            "click .edit-projects":function(e){
                var self = this;
                var $this = $(e.currentTarget).closest('.projectsPanel');
                $this.find('.project').toggle();
                $this.find('.bootstrap-tagsinput').toggle();
                $this.find('.btn-primary').toggle();
                $this.find('.cancel').toggle();
                self.$('.edit-projects').toggle();
                self.$('.edit').toggle();
            },
            "click .edit":function(e){
                var self = this;
                var $this = $(e.currentTarget).closest('.usersPanel');
                $this.find('.user').toggle();
                $this.find('.bootstrap-tagsinput').toggle();
                $this.find('.btn-primary').toggle();
                $this.find('.cancel').toggle();
                self.$('.edit').toggle();
                self.$('.edit-projects').toggle();
            },
            "click .cancel":function(e){
                api.invalidate();
                this.app.router.reload();
            },
            "click .save-projects":function(e) {
                // data = {projects:[{_idp: "_idp"}],_id : "id"}
                var self = this;
                var $this = $(e.currentTarget);
                var id = $this.data('teamid');
                var $tags = $this.closest('.projectsPanel').find('.project-tags').tagsinput('items');
                var allprojects = _.reduce(self.data.proj,function(memo,i){
                    memo[i.name] = i._id;
                    return memo;
                },{})
                var data = {projects:[],_id:id};
                _.each($tags,function(r){
                    if (allprojects)
                        data.projects.push({_idp:allprojects[r]})
                });

                api("assets.setProjects", "public", data, function (err, data) {
                    if (err) {
                        alert(err)
                    }
                    else {
                        api.invalidate();
                        self.app.router.reload();
                    }
                })
            },
            "click .save-user":function(e) {
                var self = this;
                var $this = $(e.currentTarget).closest('.usersPanel');
                var $tags = $this.find('.tags').tagsinput('items');
                var $id = $(e.currentTarget).data('teamid');
                var allusers = _.reduce(self.data.usr,function(memo, i){
                    memo[i.firstname +" "+ i.lastname] = i._id;
                    return memo
                },{});
                var data = {users:[]}; // data = {users:[{_idu: "idu",role: "role"}],_id:"id"}
                data._id = $id;

                _.each($tags,function(r){
                    if(allusers[r])
                        data.users.push({_idu:allusers[r],role: $(e.currentTarget).data('type')})
                });
                data._s_type = $(e.currentTarget).data('type');

                api('assets.addUsers','public',data,function(){
                        api.invalidate();
                        self.app.router.reload();
                })
            },
            'click .doNewProject': function(e) {
                var self = this;
                require(["views/modals/project"],function (Modal) {
                    var modal = new Modal({app:self.app});
                    modal.data = {};
                    modal.render(safe.sure(self.app.errHandler, function (text) {
                        var $modal = $(text)
                        self.$el.prepend($modal);
                        modal.bindDom($modal);
                    }))
                    modal.once("saved", function () {
                        api.invalidate();
                        self.app.router.reload();
                    })
                }, this.app.errHandler)
            },
            'click .btn-info': function(ebtn) {
                var self = this;
                var role = self.$('.li-role');
                role.on('click', function(e) {
                    ebtn.currentTarget.innerHTML = $(e.currentTarget).data('role');
                    role.off()
                })
            },
            'click #addnt':function(e) {
                var self = this;
                var modal = self.$('#settings');
                var name = self.$('#name')[0];
                var id = self.$('#_id')[0];

                modal.modal('show');
                name.setAttribute('value', '');
                id.setAttribute('value', '');
                return false;
            },
            'click .btn-danger': function(e) {
                var self = this;
                $this = $(e.currentTarget);
                var data = $this.data('del').split(',');
                api("assets.pullData", "public", {idt: data[0], _idtt: data[1], _id: data[2]}, function(err) {
                    if (err) {
                        alert(err)
                    }
                    else {
                        require(["views/teams/teams"],function (Modal) {
                            self.app.router.navigateTo("/web/teams");
                        })
                    }
                })
            },
            'click #savebtn':function (e) {
                var self = this;
                var name = self.$('#name').val();
                var id = self.$('#_id').val();
                var warn = self.$('#warn');
                var modal = self.$('#settings');

                if (name.length < 3) {
                    warn.html('Name is to short')
                }
                else {
                        if(id.length != 0) {
                            api("assets.updateTeam", "public", {name: name,  id: id},
                                function(err) {
                                    if (err)
                                        throw err
									else {
										modal.modal('hide');
										self.app.router.navigateTo("/web/teams");
									}
                                });
                        }
                        else {
                            api("assets.saveTeam", "public", {name: name},  function(err) {
                                if (err)
                                    throw err
								else {
									modal.modal('hide');
									self.app.router.navigateTo("/web/teams");
								}
                            });
                        }
                        require(["views/teams/teams"],function (Modal) {
                            self.app.router.navigateTo("/web/teams");
                        })
                }
                return false;
            },
            'click #edit':function (e) {
                var self = this;
                var modal = self.$('#settings');
                var name = self.$('#name')[0];
                var id = self.$('#_id')[0];

                modal.modal('show');
                $this = $(e.currentTarget);
                var data = $this.data('edit').split(',');
                name.setAttribute('value', data[0]);
                id.setAttribute('value', data[1]);
                return false;
            },
            'click #delete':function (e) {
                var self = this;

                $this = $(e.currentTarget);
                api("assets.removeTeam", "public", {id: $this.data('delete')},  function(err) {
                    if (err)
                        throw err
                });
                require(["views/teams/teams"],function (Modal) {
                    self.app.router.navigateTo("/web/teams");
                })
                return false;
            }
    }})
    View.id = "views/teams/teams";
    return View;
})

