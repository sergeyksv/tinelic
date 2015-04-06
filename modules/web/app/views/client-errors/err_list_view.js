define(['tinybone/base','dustc!templates/client-errors/err_list.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/client-errors/err_list"
	})
	View.id = "views/client-errors/err_list_view";
	return View;
})
