define(['tinybone/view'],function (view,safe,dust) {
	return view.extend({
		id:"layout",
		render:function (cb) {
			view.prototype.renderHtml.call(this,cb);
		}
	})
})
