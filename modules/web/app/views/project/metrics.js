define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/metrics.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var safe = require("safe");
	var View = view.extend({
		id:"views/project/metrics",
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.metrics')) {
				getApiData.call(this);
			}
		}
	});
	function getApiData() {
		var self = this;
		var params = self.data.params;
		if (_.isArray(params)===true) {
			safe.eachOfSeries(params, function (current_params, cb) {
				api("stats.getMetricTotals", $.cookie('token'), current_params, function(err, data) {
					if (err) {
						console.error(err);
					} else {
						self.data.metrics = data;
						self.refresh(self.app.errHandler);
					}
				});
				cb(null, current_params);
			});
		} else {
			api("stats.getMetricTotals", $.cookie('token'), params, function(err, data) {
				if (err) {
					console.error(err);
				} else {
					self.data.metrics = data;
					self.refresh(self.app.errHandler);
				}
			});
		}
	}
	View.id = "views/project/metrics";
	return View;
});
