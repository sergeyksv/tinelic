define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/teamproject/teamproject.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/teamproject/teamproject",
		events: {},
		postRender:function () {
			var self = this;
			self.on("pageStats", function(data) {
				refView(self.views, "statGraph");
			});
		}
	});
	function refView(views, event) {
		_.forEach(views, function (el) {
			if (el.locals.depends === event) {
				el.refresh(function () {});
			}
			if (el.views.length) {
				refView(el.views, event);
			}
		});
	}
	View.id = "views/teamproject/teamproject";
	return View;
});
