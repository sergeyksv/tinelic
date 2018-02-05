define(['tinybone/base','safe','tinybone/backadapter','dustc!views/index/index.dust'],function (tb,safe,api,tpl) {
	var view = tb.View;
	var View = view.extend({
		id:"views/index/index",
		events: {
			'click .do-addfv': function (e) {
				var self = this;
				$this = $(e.currentTarget);
				api("users.saveFavorites", $.cookie('token'),{_idfavorite:$this.data('addfv'), update:$this.data('kt')}, function(err) {
					if (err)
						console.error(err);
				});
				self.app.router.reload();
				return false;
			},
			'click .do-fv': function (e) {
				var self = this;
				$this = $(e.currentTarget);
				var h = window.location.pathname.split('/',3)
				this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'?fv='+$this.data('fv'));
				self.app.router.reload();
				return false;
			},
		},
		postRender:function () {
			var $teams = this.$(".list-group-item");
			// autoexpand teams if we have less than 10 projects
			if ($teams.length<10) {
				this.$(".list-group-item.row").click();
			}
			$('.no-collapsable').on('click', function (e) {
				e.stopPropagation();
			});
        }
	})
	View.id = "views/index/index";
  return View;
})
