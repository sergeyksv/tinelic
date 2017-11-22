define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/server-err.dust'],function (tb,_,moment,api) {
	var view = tb.View;
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
				_.assign(self.data.serverErrors, newData);
				self.refresh(self.app.errHandler);
			}
		});
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
