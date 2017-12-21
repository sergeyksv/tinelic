define(['tinybone/base','lodash','moment','safe',"tinybone/backadapter",'highcharts',
	'dustc!views/project/application.dust'],function (tb,_,moment,safe,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/application",
		events: {
			'click .getApiData': function(e) {
				getApiData.call(this);
			}
		},
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.flags.topTransactions')) {
				_.set(self, 'data.flags.topTransactions', true);
				getApiData.call(this);
			}

		}
	});
	function getApiData() {
		var self = this;
		var params = self.data.params
		self.$('.getApiData').addClass('spinning');
		self.parent.getMixStats(params, function (err, data){
			if (err) {
				console.error(err);
			} else {
				var newData = processingData(data.stats);
				_.assign(self.data.topTransactions, newData);
				self.refresh(self.app.errHandler);
			}
		});
	}
	function processingData(apiData) {
		var progress = 0;
		var data = [];
		if (apiData.length) {
			apiData = _.sortBy(apiData, function (s) { return s.value.tt; } );
			_.forEach(apiData, function(r) {
				progress += r.value.tt;
			});
			data = _.take(apiData.reverse(), 10);
			_.forEach(data, function(r) {
				r.value.progress = (r.value.tt/progress)*100;
				r.value.tta = r.value.tt/r.value.c/1000;
			});
		}
		return {data: data};
	}
	View.id = "views/project/application";
	return View;
});
