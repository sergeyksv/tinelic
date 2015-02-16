define(['tinybone/base', "tinybone/backadapter", 'dustc!templates/users.dust','bootstrap/modal'],function (tb, api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/users",
        events: {
            //'click .doUpdate':"doUpdate",
            'click #addnu':function(e) {
                var self = this;
                var modal = self.$('#settings');
                var fname = self.$('#firstname')[0];
                var lname = self.$('#lastname')[0];
                var login = self.$('#login')[0];
                var id = self.$('#_id')[0];

                modal.modal('show');
                fname.setAttribute('value', '');
                lname.setAttribute('value', '');
                login.setAttribute('value', '');
                id.setAttribute('value', '');
                return false;
            },
            'click #savebtn':function (e) {
                var self = this;
                var fname = self.$('#firstname')[0].value;
                var lname = self.$('#lastname')[0].value;
                var login = self.$('#login')[0].value;
                var pass = self.$('#userpass')[0].value;
                var rpass = self.$('#userrpass')[0].value;
                var id = self.$('#_id')[0].value;
                var warn = self.$('#warn');

                if (pass.length < 3 || lname.length < 3 || fname.length < 3 || login.length < 3 ) {
                    warn.html('Name or password is to short')
                }
                else {
                    if (pass != rpass) {
                        warn.html('Password does not match')
                    }
                    else {
                        if(id.length != 0) {
                            api("users.updateUser", "public", {firstname: fname, lastname: lname, login: login, pass: pass,  id: id},
                            function(err) {
                                if (err)
                                    throw err
                            });
                        }
                        else {
                            api("users.saveUser", "public", {firstname: fname, lastname: lname, login: login, pass: pass},  function(err) {
                                if (err)
                                    throw err
                            });
                        }
                        require(["views/users_view"],function (Modal) {
                            self.app.router.navigateTo("/web/users");
                        })
                    }
                }
                return false;
            },
            'click #edit':function (e) {
                var self = this;
                var modal = self.$('#settings');
                var fname = self.$('#firstname')[0];
                var lname = self.$('#lastname')[0];
                var login = self.$('#login')[0];
                var id = self.$('#_id')[0];

                modal.modal('show');
                $this = $(e.currentTarget);
                var data = $this.data('edit').split(',');
                fname.setAttribute('value', data[0]);
                lname.setAttribute('value', data[1]);
                login.setAttribute('value', data[2]);
                id.setAttribute('value', data[3]);
                return false;
            },
            'click #delete':function (e) {
                var self = this;

                $this = $(e.currentTarget);
                api("users.removeUser", "public", {id: $this.data('delete')},  function(err) {
                    if (err)
                        throw err
                });
                require(["views/users_view"],function (Modal) {
                    self.app.router.navigateTo("/web/users");
                })
                return false;
            }
        }
    })

    View.id = "views/users_view";
    return View;
})
