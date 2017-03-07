define(['tinybone/base', 'dustc!views/project/top-pages-stats.dust'], function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/top-pages-stats",
		postRender: function () {
			console.log('this 1', this);
		}
	});
	View.id = "views/project/top-pages-stats";
	return View;
});
