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
		self.$('.getApiData').addClass('spinning');
		var params = self.data.params;
		safe.parallel([
			function (cb) {
				api("stats.getActionStats", $.cookie('token'), _.merge({filter:{_s_cat:"WebTransaction"}}, params), function(err, data) {
					if (err) {
						console.error(err);
					} else {
						var newData = processingData(data);
						_.extend(self.data.topTransactions, newData);
					}
					cb();
				});
			},
			function (cb) {
				api("stats.getActionTimings", $.cookie('token'), _.merge({filter: {_s_cat: "WebTransaction"}}, params), function(err, data) {
					if (err) {
						console.error(err);
					} else {
						var newData = processingTotalData(data);
						_.extend(self.data.topTransactions, newData);
					}
					cb();
				});
			}
		], safe.sure(self.app.errHandler, function() {
			self.refresh(self.app.errHandler);
		}));
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
	function processingTotalData(apiData) {
		var vale, valtt, valr, valapd;
		vale = valtt = valr = valapd = 0;
		var period = 0;
		period = apiData.length;
		_.forEach(apiData, function (v) {
			v = v.value;
			vale += v.e;
			valr += v.r;
			valtt += v.tta;
			valapd += v.apdex;
		});
		valtt=valtt/period/1000;
		valr=valr/period;
		vale=vale/period/valr;
		valapd=valapd/period;
		return {total: {rsm: valr, ttserver: valtt, apdserver: valapd, erroraction: vale}};
	}
	View.id = "views/project/application";
	return View;
});
