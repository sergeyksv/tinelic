define(['tinybone/base','safe'],function (tb,safe) {
	var view = tb.View;
	return view.extend({
		id:"index",
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
})
