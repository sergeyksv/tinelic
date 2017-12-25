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
				api("stats.getActionMixStats", $.cookie('token'), _.merge({filter:{_s_cat:"WebTransaction"}}, params), function(err, data) {
					_.forEach(cb_arr, function(current_cb) {
						current_cb(err,data)
					})
					cb_arr = [];
				});
			}
			var cb_ajax_arr = [];
			this.getAjaxMixStats = function(params, cb) {
				cb_ajax_arr.push(cb);
				api("stats.getAjaxMixStats", $.cookie('token'), params, function(err, data) {
					_.forEach(cb_ajax_arr, function(current_cb) {
						current_cb(err,data)
					})
					cb_ajax_arr = [];
				});
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
