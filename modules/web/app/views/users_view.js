define(['tinybone/base','dustc!templates/users.dust','bootstrap/modal'],function (tb) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/users",
        events: {
            //'click .doUpdate':"doUpdate",
            'click #addnu':function(e) {
                var modal = $('#settings');
                var fname = $('#firstname')[0];
                var lname = $('#lastname')[0];
                var login = $('#login')[0];
                var id = $('#_id')[0];
                modal.modal('show');
                fname.setAttribute('value', '');
                lname.setAttribute('value', '');
                login.setAttribute('value', '');
                id.setAttribute('value', '');
                return false;
            },
            'click #savebtn':function (e) {
                var self = this;
                var modal = $('#settings');
                var fname = $('#firstname')[0].value;
                var lname = $('#lastname')[0].value;
                var login = $('#login')[0].value;
                var pass = $('#userpass')[0].value;
                var rpass = $('#userrpass')[0].value;
                var id = $('#_id')[0].value;
                var warn = $('#warn');

                if (pass.length < 3 || lname.length < 3 || fname.length < 3 || login.length < 3 ) {
                    warn.html('Name or password is to short')
                }
                else {
                    if (pass != rpass) {
                        warn.html('Password does not match')
                    }
                    else {
                        $.ajax({
                            type: 'POST',
                            url: '/users',
                            data: {firstname: fname, lastname: lname, login: login, pass: pass, id: id},
                            success: function(data) {
                                modal.modal('hide');
                                require(["views/users_view"],function (Modal) {
                                    self.app.router.navigateTo("/web/users");
                                })
                            },
                            error:  function(xhr, str){
                                warn.html('Error: ' + xhr.status);
                            }
                        });
                    }
                }
                return false;
            },
            'click #edit':function (e) {
                var modal = $('#settings');
                var fname = $('#firstname')[0];
                var lname = $('#lastname')[0];
                var login = $('#login')[0];
                var id = $('#_id')[0];
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
                $.ajax({
                    type: 'POST',
                    url: '/users',
                    data: {id: $this.data('delete'), opts: 'delete'},
                    success: function(data) {
                        require(["views/users_view"],function (Modal) {
                            self.app.router.navigateTo("/web/users");
                        })
                    },
                    error:  function(xhr, str){
                    }
                });
                return false;
            }
        }
    })

    View.id = "views/users_view";
    return View;
})
