define(['tinybone/base','lodash','moment',"tinybone/backadapter", 'safe','highcharts',
	'dustc!views/project/graph.dust'],function (tb,_,moment,api, safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/graph",
		events: {
			'click .getApiData': function(e) {
				getApiData.call(this);
			}
		},
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.flags.graph')) {
				_.set(self, 'data.flags.graph', true);
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
				api("stats.getActionTimings", $.cookie('token'), _.merge({filter: {_s_cat: "WebTransaction"}}, params), function(err, data) {
					if (err) {
						console.error(err);
					} else {
						_.extend(self.data.actions, data);
					}
					cb();
						});
					},
					function (cb) {
						api("stats.getPageTimings", $.cookie('token'), params, function(err, data) {
							if (err) {
								console.error(err);
							} else {
								_.extend(self.data.views, data);
							}
							cb();
						});
					},
					function (cb) {
						api("stats.getAjaxTimings", $.cookie('token'), params, function(err, data) {
							if (err) {
								console.error(err);
							} else {
								_.extend(self.data.ajax, data);
							}
							cb();
						});
					}
				], safe.sure(self.app.errHandler, function() {
					self.data.statGraph = processingStat({
						actions: self.data.actions,
						views: self.data.views,
						ajax: self.data.ajax
			});
			self.parent.trigger("pageStats", self.data.statGraph);
					self.data.graphOn = {
						server: _.get(self, 'data.actions') ? 1 : 0,
						browser: _.get(self, 'data.views') ? 1 : 0,
						ajax: _.get(self, 'data.ajax') ? 1 : 0
					};
					self.refresh(self.app.errHandler);
				}));
	}
	function processingStat(apiData) {
		var vale, valtt, valr, valapd;
		var result = {};
		// actions
		if (_.get(apiData, 'actions')) {
			vale = valtt = valr = valapd = 0;
			var period = 0;
			period = apiData.actions.length;
			_.forEach(apiData.actions, function (v) {
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
			_.extend(result, {rsm: valr, ttserver: valtt, apdserver: valapd, erroraction: vale});
		}

		// views
		if (_.get(apiData, 'views')) {
			valtt = vale = valr = valapd = 0;
			period = apiData.views.length;
			_.forEach(apiData.views, function (v) {
				v = v.value;
				valr+=v.r;
				valtt+=v.tta;
				vale+=v.e;
				valapd+=v.apdex;
			});

			valtt=valtt/period/1000;
			valr=valr/period;
			vale=vale/period/valr;
			valapd=valapd/period;
			_.extend(result, {rpm: valr, errorpage: vale, etupage: valtt, apdclient: valapd});
		}
		// ajax
		if (_.get(apiData, 'ajax')) {
			valtt = vale = valr = valapd = 0;
			period = apiData.ajax.length;
			_.forEach(apiData.ajax, function (v) {
				v = v.value;
				valr+=v.r;
				valtt+=v.tta;
				vale+=v.e;
				valapd+=v.apdex;
			});

			valtt=valtt/period/1000;
			valr=valr/period;
			vale=vale/period/valr;
			valapd=valapd/period;
			_.extend(result, {ram: valr, errorajax: vale, etuajax: valtt, apdajax: valapd});
		}
		return result;
	}
	View.id = "views/project/graph";
	return View;
});
