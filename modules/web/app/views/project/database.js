define(['tinybone/base','lodash','moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/database.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/database",
		events: {
			'click .getApiData': function(e) {
				getApiData.call(this);
			}
		},
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.flags.database')) {
				_.set(self, 'data.flags.database', true);
				getApiData.call(this);
			}
		}
	});
	function getApiData() {
		var self = this;
		self.$('.getApiData').addClass('spinning');
		var params = self.data.params;
		api("stats.getActionSegmentStats", $.cookie('token'), _.merge({filter: {'data._s_cat': 'Datastore'}}, params), function(err, data) {
			if (err) {
				console.error(err);
			} else {
				var newData = processingData(data);
				_.assign(self.data.database, newData);
				self.refresh(self.app.errHandler);
				params._t_age = 0;
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
				r.value.avg = r.value.tt/r.value.c/1000;
			});
		}
		return {data:data};
	}
	View.id = "views/project/database";
	return View;
});
