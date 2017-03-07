define(['tinybone/base', 'dustc!views/project/top-ajax-stats.dust'], function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/top-ajax-stats",
		postRender: function () {}
	});
	View.id = "views/project/top-ajax-stats";
	return View;
});
