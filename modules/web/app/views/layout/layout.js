define(['tinybone/base','dustc!views/layout/layout.dust','views/header/header'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"views/layout/layout",
		render:function (cb) {
			view.prototype.renderHtml.call(this,cb);
		},
		events:{
			"click a":function (e) {
				e.preventDefault()
				this.app.router.navigateTo($(e.currentTarget).attr("href"), this.app.errHandler);
			}
		}
	})
	View.id = "views/layout/layout";
	return View;
})
