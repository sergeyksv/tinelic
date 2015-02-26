define(['tinybone/base', 'lodash', 'dustc!templates/ajax_rpm.dust'],function (tb,_) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/ajax_rpm",
		postRender:function () {
			view.prototype.postRender.call(this);
			var ajax = this.data.rpm;
		}
	})
	View.id = "views/ajax_rpm_view";
	return View;
})
