define(['tinybone/base','dustc!templates/header.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/header",
		postRender:function () {
			view.prototype.postRender.call(this);
		}
	})
	View.id = "views/header_view";
	return View;
})

