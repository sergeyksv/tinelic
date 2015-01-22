define(['tinybone/base','dustc!templates/layout.dust','views/header_view'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"templates/layout",
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
})
