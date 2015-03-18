define(['tinybone/base','dustc!templates/server-errors/server-err_list.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/server-errors/server-err_list"
	})
	View.id = "views/server-errors/server-err_list_view";
	return View;
})
