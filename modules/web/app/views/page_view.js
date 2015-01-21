define(['tinybone/base','dustc!templates/page.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/page"
	})
	View.id = "views/page_view";
	return View;
})
