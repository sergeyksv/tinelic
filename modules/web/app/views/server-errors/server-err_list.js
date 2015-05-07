define(['tinybone/base','dustc!views/server-errors/server-err_list.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"views/server-errors/server-err_list"
	})
	View.id = "views/server-errors/server-err_list";
	return View;
})
