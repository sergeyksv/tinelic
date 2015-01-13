define(['tinybone/base'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"header",
		postRender:function () {
			this.$(".navbar-brand").append("<font color='red'>Client code works!!! " +this.data+"</font>");
			view.prototype.postRender.call(this);
		}
	})
})

