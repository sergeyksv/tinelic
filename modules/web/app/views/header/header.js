define(['tinybone/base',"tinybone/backadapter",'dustc!views/header/header.dust','bootstrap/dropdown','dust-helpers'],function (tb,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/header/header",
		events: {
			'click .dropdown-menu li':function (e) {
				e.preventDefault();
				$this = $(e.currentTarget);
				$.cookie('str', $this.data('range'), {expires: 5,path: '/',});
				this.app.router.reload();
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
						self.app.router.reload();
					}
				});
			}
		}

	})
	View.id = "views/header/header";
	return View;
})

