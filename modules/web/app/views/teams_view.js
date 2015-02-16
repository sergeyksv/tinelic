/**
 * Created by ivan on 2/16/15.
 */
define(['tinybone/base',"tinybone/backadapter",'dustc!../templates/teams.dust','bootstrap/modal' ],function (tb, api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/teams",
        events: {
            //'click .doUpdate':"doUpdate",
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
                            api("teams.updateTeam", "public", {name: name,  id: id},
                                function(err) {
                                    if (err)
                                        throw err
                                });
                        }
                        else {
                            api("teams.saveTeam", "public", {name: name},  function(err) {
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
                api("teams.removeTeam", "public", {id: $this.data('delete')},  function(err) {
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

