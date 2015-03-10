define(['tinybone/base','dustc!templates/event_stats.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/event_stats"
	})
	View.id = "views/event_stats_view";
	return View;
})
