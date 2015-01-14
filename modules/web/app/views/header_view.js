define(['tinybone/base'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"header",
		postRender:function () {
			view.prototype.postRender.call(this);
		}
	})
})

