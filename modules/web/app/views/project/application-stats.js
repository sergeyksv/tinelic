define(['tinybone/base', 'dustc!views/project/application-stats.dust'], function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/application-stats",
		postRender: function () {}
	});
	View.id = "views/project/application-stats";
	return View;
});
