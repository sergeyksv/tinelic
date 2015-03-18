/**
 * Created by ivan on 2/16/15.
 */
define(['tinybone/base',"tinybone/backadapter",'dustc!../templates/teams.dust','bootstrap/modal' ],function (tb, api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/teams",
        events: {
            //'click .doUpdate':"doUpdate",
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
                var modal = self.$('#modal-add-project')
                $this = $(e.currentTarget);
                id.setAttribute('value', $this.data('addp'));
                modal.modal("show")
            },
            'click #li-add-user': function(e) {
                var self = this;
                var id = self.$('._idteamu')[0];
                var modal = self.$('#modal-add-users')
                $this = $(e.currentTarget);
                id.setAttribute('value', $this.data('addu'));
                modal.modal("show")
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
            'click #btn-add-users': function(e) {
                var self = this;
                var n = self.$( ".cb-au:checked");
                var id = self.$('._idteamu').val();
                var dang = self.$('#addu-warn');
                var input = self.$('.btn-info');
                var data = {};
                data.users = [];
                $.each(n, function(i, val) {
                    var n = val.value.split(',');
                    $.each(input, function(i, val1) {
                        if (n[0] == val1.name) {
                            data.users.push({_idu: n[0], role: val1.innerHTML.toLowerCase()})
                        }
                    })
                })
                data._id = id;
                if (n.length) {
                  api("assets.addUsers", "public", data, function (err) {
                        if (err) {
                            dang.html(err.message);
                        }
                        else {
                            require(["views/teams_view"],function (Modal) {
                                self.app.router.navigateTo("/web/teams");
                            })
                        }
                    })
                }
                else {
                    dang.html('Users is not checked')
                }
            },
            'click #btn-add-project': function(e) {
                var self = this;
                var n = self.$( ".cb-ap:checked");
                var id = self.$('._idteam').val();
                var dang = self.$('#addp-warn');
                var data = {};
                data.projects = [];
                $.each(n, function(i, val) {
                    var n = val.value.split(',');
                    data.projects.push({_idp: n[0]})
                })
                data._id = id;
                if (n.length) {
                    api("assets.addProjects", "public", data, function (err, data) {
                        if (err) {
                            dang.html(err);
                        }
                        else {
                            require(["views/teams_view"],function (Modal) {
                                self.app.router.navigateTo("/web/teams");
                            })
                        }
                    })
                }
                else {
                    dang.html('Project is not checked')
                }
            },
            'click #savebtn':function (e) {
                var self = this;
                var name = self.$('#name').val();
                var id = self.$('#_id').val();
                var warn = self.$('#warn');

                if (name.length < 3) {
                    warn.html('Name is to short')
                }
                else {
                        if(id.length != 0) {
                            api("assets.updateTeam", "public", {name: name,  id: id},
                                function(err) {
                                    if (err)
                                        throw err
                                });
                        }
                        else {
                            api("assets.saveTeam", "public", {name: name},  function(err) {
                                if (err)
                                    throw err
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

