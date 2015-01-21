define(['tinybone/base','safe','dustc!templates/index.dust'],function (tb,safe,tpl) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/index",
		events:{
			"click .do-newproject":"doNewProject"
		},
		doNewProject:function(e) {
			var self = this;
			require(["views/modals/project"],function (Modal) {
				var modal = new Modal({app:self.app});
				modal.data = {};
				modal.render(safe.sure(self.app.errHandler, function (text) {
					self.$el.prepend(text);
					modal.bindDom(self.$el);
					modal.postRender();
				}))
				modal.once("saved", function () {
					self.app.router.navigateTo(".");
				})
			}, this.app.errHandler)
		}
	})
	View.id = "views/index_view";
	return View;
})
