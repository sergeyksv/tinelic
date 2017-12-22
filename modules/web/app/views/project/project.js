define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/project.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/project",
		events: {},
		postRender:function () {
			var self = this;
			self.on("pageStats", function(data) {
				refView(self.views, "statGraph");
			});
			var cb_arr = [];
			this.getMixStats = function(params, cb) {
				cb_arr.push(cb);
				if (cb_arr.length>1) {
					api("stats.getActionMixStats", $.cookie('token'), _.merge({filter:{_s_cat:"WebTransaction"}}, params), function(err, data) {
						if (cb_arr.length==2) {
							_.forEach(cb_arr, function(current_cb) {
								current_cb(err,data)
							})
						} else {
							cb_arr[(cb_arr.length - 1)](err, data);
						}
					});
				}
			}
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
	View.id = "views/project/project";
	return View;
});
