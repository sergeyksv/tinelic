define(['tinybone/view'],function (view,safe,dust) {
	return view.extend({
		id:"layout",
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
