define(['tinybone/base','safe','dustc!templates/index.dust'],function (tb,safe,tpl) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/index"
	})
	View.id = "views/index_view";
	return View;
})
