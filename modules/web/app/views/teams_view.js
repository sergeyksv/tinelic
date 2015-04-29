/**
 * Created by ivan on 2/16/15.
 */
define(['tinybone/base',"tinybone/backadapter","safe",'lodash','bootstrap/typeahead','bootstrap/tagsinput','dustc!../templates/teams.dust','bootstrap/modal'],function (tb, api, safe,_) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/teams",
        postRender:function(){
            var self = this;
            var usersPanel = self.$('.usersPanel');


            var users = [];
            _.each(self.data.usr,function(k){
                users.push({fname: k.firstname +" "+ k.lastname})
            });
            var unames = new Bloodhound({
                local: users,
                datumTokenizer: function(d) {
                    return Bloodhound.tokenizers.whitespace(d.fname);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace
            });
            unames.initialize();

            usersPanel.find('.tags').tagsinput({
                typeaheadjs: {
                    displayKey: 'fname',
                    valueKey: 'fname',
                    source: unames.ttAdapter()
                }
            });
            usersPanel.find('.bootstrap-tagsinput').hide();
        },
        'doUpdate':function(e){
            var self = this;
            var $this = $(e.currentTarget).closest('.usersPanel');
            $this.find('.user').toggle();
            $this.find('.bootstrap-tagsinput').toggle();
            $this.find('.btn-primary').toggle();
            $this.find('.cancel').toggle();
            self.$('.edit').toggle();
        },
        events: {
            //'click .doUpdate':"doUpdate",
            "click .edit":'doUpdate',
            "click .cancel":'doUpdate',
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
            'click #li-add-project': function(e) {
                var self = this;
                var id = self.$('._idteam')[0];
                var $modal = self.$('#modal-add-project');
                var $tags = $modal.find('.tags');
                $this = $(e.currentTarget);
                id.setAttribute('value', $this.data('addp'));
                $modal.modal("show");
                var pnames = new Bloodhound({
                    local: self.data.proj,
                    datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.name);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace
                });
                pnames.initialize();

                $tags.tagsinput({
                    typeaheadjs: {
                        displayKey: 'name',
                        valueKey: 'name',
                        source: pnames.ttAdapter()
                    }
                });

            },
            'click .tag': function(e) {
                var $this = $(e.currentTarget);
                $this.toggleClass('label-danger');
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
                        require(["views/teams_view"],function (Modal) {
                            self.app.router.navigateTo("/web/teams");
                        })
                    }
                })
            },
            'click #btn-add-project': function(e) {
                var self = this;
                var $modal = self.$("#modal-add-project");
                var $items = $modal.find('.tags').tagsinput('items');
                var $allitems = _.reduce($modal.find('.pOption'),function(memo,i){
                    memo[$(i).val()] = $(i).data('projectid');
                    return memo
                },{});
                var id = self.$('._idteam').val();
                var dang = self.$('#addp-warn');

                var data = {projects:[]}; // data = {projects:[{_idp: "_idp"}],_id : "id"}

                _.each($items, function(item) {
                    if($allitems[item])
                        data.projects.push({_idp:$allitems[item]})
                });

                data._id = id;
                if ($items.length) {
                    api("assets.addProjects", "public", data, function (err, data) {
                        if (err) {
                            dang.html(err);
                        }
                        else {
							$modal.modal('hide');
                            api.invalidate();
                            self.app.router.reload();
                        }
                    })
                }
                else {
                    dang.html('Project is not selected')
                }
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
                        require(["views/teams_view"],function (Modal) {
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
                require(["views/teams_view"],function (Modal) {
                    self.app.router.navigateTo("/web/teams");
                })
                return false;
            }
    }})
    View.id = "views/teams_view";
    return View;
})

