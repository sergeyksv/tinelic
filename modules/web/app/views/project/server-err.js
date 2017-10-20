define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/server-err.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var safe = require("safe");
	var View = view.extend({
		id:"views/project/server-err",
		events: {
			'click .getApiData': function(e) {
				getApiData.call(this);
			}
		},
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.flags.server-err')) {
				_.set(self, 'data.flags.server-err', true);
				getApiData.call(this);
			}
		}
	});
	function getApiData() {
		var self = this;
		self.$('.getApiData').addClass('spinning');
		var params = self.data.params;
		if (_.isArray(params)===true) {
			safe.eachOfSeries(params, function (current_params, cb) {
				api("stats.getActionErrorStats",$.cookie('token'), {
					quant: current_params.quant,
					filter: {
						_idp: current_params.filter._idp,
						_dt: {
							$gt: current_params._dtActionsErrAck,
							$lte: current_params.filter._dt.$lte
						}
					}
				}, function(err, data) {
					if (err) {
						console.error(err);
					} else {
						var newData = processingData(data);
						_.extend(self.data.serverErrors, newData);
						self.refresh(self.app.errHandler);
					}
				});
				cb(null, current_params);
			});
		} else {
			api("stats.getActionErrorStats",$.cookie('token'), {
				quant: params.quant,
				filter: {
					_idp: params.filter._idp,
					_dt: {
						$gt: params._dtActionsErrAck,
						$lte: params.filter._dt.$lte
					}
				}
			}, function(err, data) {
				if (err) {
					console.error(err);
				} else {
					var newData = processingData(data);
					_.extend(self.data.serverErrors, newData);
					self.refresh(self.app.errHandler);
				}
			});
		}
	}
	function processingData(apiData) {
		var total = 0;
		var data = [];
		if (apiData.length) {
			apiData = _.sortBy(apiData, function (s) { return -1*s.stats.c; } );
			_.forEach(apiData, function(r) {
				total += r.stats.c;
			});
			data = _.take(apiData, 10);
		}
		return {data:data, total:total};
	}
	View.id = "views/project/server-err";
	return View;
});
