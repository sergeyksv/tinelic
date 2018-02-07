define(['tinybone/base','tinybone/backadapter','bootstrap/modal','dustc!views/teams/teamedit.dust'],function (tb,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/teams/teamedit",
        postRender:function () {
            view.prototype.postRender.call(this);
            this.$el.modal({});
        },
        events:{
            'click .do-cancel, click .do-close': function(e) {
                this.trigger('cancel');
                this.remove();
            },
            'click .do-save': function(e) {
                var self = this;
                var name = self.$('#name').val();
                var id = self.get('_id');
                var warn = self.$('#warn');
                var modal = self.$el;

                if (name.length < 3) {
                    warn.html('Name is to short');
                    return;
                }

                var data = {name: name};
                if (id)
                    data._id = id;

                api("assets.saveTeam", $.cookie('token'), {team:data}, function(err) {
                    if (err)
                        warn.html(err.toString());
					else {
                        self.trigger('saved');
                        self.remove();
						window.location.reload();
					}
                });
                return false;
            }
        },
        remove: function () {
			this.$el.modal('hide');
			return view.prototype.remove.call(this);
		}
	});
	View.id = "views/teams/teamedit";
	return View;
});
