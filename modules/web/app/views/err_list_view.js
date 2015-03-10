define(['tinybone/base','dustc!templates/err_list.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/err_list"
	})
	View.id = "views/err_list_view";
	return View;
})
