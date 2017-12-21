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
				if (cb_arr.length==2) {
				api("stats.getActionMixStats", $.cookie('token'), _.merge({filter:{_s_cat:"WebTransaction"}}, params), function(err, data) {
					if (err) {
						console.error(err);
					} else {
						cb_arr[0](null, data);
						cb_arr[1](null, data)
					}
				});
				} else if (cb_arr.length>2) {
					var i = cb_arr.length
					api("stats.getActionMixStats", $.cookie('token'), _.merge({filter:{_s_cat:"WebTransaction"}}, params), function(err, data) {
						if (err) {
							console.error(err);
						} else {
							cb_arr[(i-1)](null, data);
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
