define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/top-ajax.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/top-ajax",
		events: {
			'click .getApiData': function(e) {
				api.invalidate();
				getApiData.call(this);
			}
		},
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.flags.top-ajax')) {
				_.set(self, 'data.flags.top-ajax', true);
				getApiData.call(this);
			}
		}
	});
	function getApiData() {
		var self = this;
		self.$('.getApiData').addClass('spinning');
		var params = self.data.params;
		self.parent.getAjaxMixStats(params, function (err, data){
			if (err) {
				console.error(err);
			} else {
				var newData = processingData(data.stats);
				_.assign(self.data.topAjax, newData);
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
		return {data:data};
	}
	View.id = "views/project/top-ajax";
	return View;
});
