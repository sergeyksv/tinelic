define(['tinybone/base','dustc!templates/server-errors/server-event_stats.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/server-errors/server-event_stats"
	})
	View.id = "views/server-errors/server-event_stats_view";
	return View;
})
