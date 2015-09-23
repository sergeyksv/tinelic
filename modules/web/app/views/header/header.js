define(["require",'tinybone/base',"tinybone/backadapter",'safe','dustc!views/header/header.dust','bootstrap/dropdown','dust-helpers','bootstrap/collapse','bootstrap/transition'],function (require,tb,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/header/header",
		events: {
            'click #doCustomRange': function(e) {
                var self = this;
                require(['views/modals/dtpick'],function(Modal){
                    var modal = new Modal({app:self.app});
                    modal.data = {};
                    modal.render(safe.sure(self.app.errHandler, function (text) {
                        var $modal = $(text);
                        self.$el.prepend($modal);
                        modal.bindDom($modal);
                    }));
                    modal.once("saved", function (data) {
                        $.cookie('str',JSON.stringify({from:data.from,to:data.to}),{expires: 5,path: '/'});
                        modal.remove();
                        self.app.router.reload();
                    });
                },this.app.errHandler);
            },
			'click .doRange':function (e) {
				e.preventDefault();
				$this = $(e.currentTarget);
				$.cookie('str', $this.data('range'), {expires: 5,path: '/'});
				this.app.router.reload();
				return false;
			},
			'click #logout': function(e) {
				var self = this;
				api("users.logout", $.cookie('token'), {},  function(err, data) {
					if (err) {
						alert('Error');
					}
					else {
						$.removeCookie("token",{path: '/'});
						api.invalidate();
						self.app.router.reload();
					}
				});
			}
		}
	});
	View.id = "views/header/header";
	return View;
});
