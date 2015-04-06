define(['tinybone/base','dustc!templates/client-errors/event_stats.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/client-errors/event_stats"
	})
	View.id = "views/client-errors/event_stats_view";
	return View;
})
