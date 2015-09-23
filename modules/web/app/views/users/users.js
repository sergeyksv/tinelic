define(['require','tinybone/base', "tinybone/backadapter",'safe', 'dustc!views/users/users.dust','bootstrap/modal'],function (require,tb, api,safe) {
    var view = tb.View;
    var View = view.extend({
        id:"views/users/users",
        events: {
            //'click .doUpdate':"doUpdate",
            'click .btn-info': function(ebtn) {
                var self = this;
                var role = self.$('.li-role');
                role.on('click', function(e) {
                    ebtn.currentTarget.innerHTML = $(e.currentTarget).data('role');
                    role.off();
                });
            },
            'click .doEditUser':function(e) {
                var self = this;
                var $this = $(e.currentTarget);
                var id = $this.data('edit');
                var user = _.find(this.data.users, function (user) { return user._id==id;});
                require(["views/users/usersedit"],function (Modal) {
                    var modal = new Modal({app:self.app});
                    modal.data = user || {};
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
                var self = this;

                $this = $(e.currentTarget);
                self.app.confirm('This will delete user permanently. Are you sure?',function(){
                    api("users.removeUser", $.cookie('token'), {_id: $this.data('delete')}, safe.sure(self.app.errHandler, function () {
						api.invalidate();
						self.app.router.reload();
					}));
                });
                return false;
            }
        }
    });

    View.id = "views/users/users";
    return View;
});
