define(['tinybone/view'],function (view) {
	return view.extend({
		id:"header",
		postRender:function () {
			this.$el.append("<font color='red'>Client code works!!! " +this.data+"</font>");
			view.prototype.postRender.call(this);
		}
	})
})

