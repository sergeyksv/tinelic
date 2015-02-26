define(['tinybone/base',"tinybone/backadapter",'dustc!templates/header.dust','bootstrap/dropdown','dust-helpers'],function (tb,api) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/header",
		postRender:function () {
			view.prototype.postRender.call(this);
		},
		events: {
			'click .dropdown-menu li':function (e) {
				e.preventDefault();
				$this = $(e.currentTarget);
				$.cookie('str', $this.data('range'), {expires: 5,path: '/',});
				this.app.router.navigateTo(window.location.pathname);
				return false;
			},
			'click #logout': function(e) {
				var self = this;
				api("users.userLogout", $.cookie('token'), {token: $.cookie('token')},  function(err, data) {
					if (err) {
						alert('Error');
					}
					else {
						$.removeCookie("token");
						self.app.router.navigateTo('.')
					}
				});
			}
		}

	})
	View.id = "views/header_view";
	return View;
})

