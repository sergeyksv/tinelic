define(['tinybone/base','lodash','moment/moment','highcharts',
	'dustc!templates/project/project.dust',
	'views/project/errors_view'],function (tb,_,moment) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/project/project",
		postRender:function () {
			view.prototype.postRender.call(this);
			var errorsView = _.find(this.views,function(v){
				return v.name == "views/project/errors_view";
			});
			var rpm = [];
			var views = this.data.views;
			var ajax = this.data.ajax;
			var actions = this.data.actions;

			views = _.sortBy(views, function (v) { return v._id; });
			var flat = [],prev = null;
			var ajflat = [], ajprev = null;
			var actflat = [], actprev = null
			_.each(views, function (v) {
				if (prev) {
					for (var i=prev._id+1; i<v._id; i++) {
						flat.push({_id:i,value:null})
					}
				}
				prev = v;
				flat.push(v);
			})
			_.each(ajax, function (a) {
				if (ajprev) {
					for (var i=ajprev._id+1; i< a._id; i++) {
						ajflat.push({_id: i, value:null});
					}
				}
				ajprev = a;
				ajflat.push(a);
			})
			_.each(actions, function (a) {
				if (actprev) {
					for (var i=actprev._id+1; i< a._id; i++) {
						actflat.push({_id: i, value:null});
					}
				}
				actprev = a;
				actflat.push(a);
			})
			var quant = this.data.quant;
			var offset = new Date().getTimezoneOffset();
			var apdexBrowser = [];
			var ttBrowser = [];
			_.each(flat, function (v) {
				var apdex = v.value?v.value.apdex:null

				if (isFinite(apdex) == false) {
					apdex = null;
				}

				var d = new Date(v._id*quant*60000);
				d.setMinutes(d.getMinutes()-offset);
				d = d.valueOf();
				var rpm1 = v.value?v.value.r:0;
				rpm.push([d,rpm1]);
				apdexBrowser.push([d,apdex]);
				ttBrowser.push([d, v.value?(v.value.tt/1000):0]);
			})

			var ajrpm = [],ajload=[];
			var apdexAjax = [];
			var ttAjax = [];
			_.each(ajflat, function (a) {
				var apdex = a.value?a.value.apdex:null
				if (isFinite(apdex) == false) {
					apdex = null;
				}
				var d = new Date(a._id*quant*60000);
				d.setMinutes(d.getMinutes()-offset);
				d = d.valueOf();
				var ajrpm1 = a.value? a.value.r:0;
				ajrpm.push([d,ajrpm1]);
				apdexAjax.push([d,apdex]);
				ttAjax.push([d, a.value?(a.value.tt/1000):0]);
			})

			var apdexActions = [];
			var actrpm1; var actrpm = [];
			var ttServer = [];
			_.each(actflat, function (a) {
				var apdex = a.value?a.value.apdex:null
				if (isFinite(apdex) == false) {
					apdex = null;
				}
				var d = new Date(a._id*quant*60000);
				d.setMinutes(d.getMinutes()-offset);
				d = d.valueOf();
				var actrpm1 = a.value? a.value.r:0;
				actrpm.push([d,actrpm1]);
				apdexActions.push([d,apdex]);
				ttServer.push([d, a.value?a.value.tt:0]);
			})

			var ajloadmax = _.max(ajload, function (v) { return v[1]; })[1];
			var ttServerMax = _.max(ttServer, function (v) { return v[1]; })[1];
			var ttBrowserMax = _.max(ttBrowser, function (v) { return v[1]; })[1];
			var ttAjaxMax = _.max(ttAjax, function (v) { return v[1]; })[1];

			this.$('#totally').highcharts({
				chart: {
					type: 'spline',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'RPM'
					},
					min:0,
					max:ajloadmax
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				series: [
					{
						name: 'PAGE',
						yAxis:0,
						data:rpm,
						color: "blue"
					},
					{
						name: 'AJAX',
						data: ajrpm,
						color: "red"
					},
					{
						name: 'SERVER',
						data: actrpm,
						color: "green"
					}

				]
			})
			this.$('#apdex-ajax').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'ajax'
					},
					min:0,
					max:1
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				legend: {
					enabled: false
				},
				series: [
					{
						name: 'apdex-ajax',
						yAxis:0,
						data:apdexAjax,
						color: "brown",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, 'red'],
								[1, 'white']
							]
						}
					}
				]
			})
			this.$('#apdex-browser').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'browser'
					},
					min:0,
					max:1
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				legend: {
					enabled: false
				},
				series: [
					{
						name: 'apdex-browser',
						yAxis:0,
						data:apdexBrowser,
						color: "blue",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, 'lightblue'],
								[1, 'white']
							]
						}
					}
				]
			})
			this.$('#apdex-server').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'server'
					},
					min:0,
					max:1
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				legend: {
					enabled: false
				},
				series: [
					{
						name: 'apdex-server',
						yAxis:0,
						data:apdexActions,
						color: "green",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, 'lightgreen'],
								[1, 'white']
							]
						}
					}
				]
			})
			this.$('#tt-server').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'tt-server'
					},
					min:0,
					max:ttServerMax
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				legend: {
					enabled: false
				},
				series: [
					{
						name: 'tt-server',
						yAxis:0,
						data:ttServer,
						color: "green",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, 'lightgreen'],
								[1, 'white']
							]
						}
					}
				]
			})
			this.$('#tt-browser').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'tt-browser'
					},
					min:0,
					max:ttBrowserMax
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				legend: {
					enabled: false
				},
				series: [
					{
						name: 'tt-browser',
						yAxis:0,
						data:ttBrowser,
						color: "blue",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, 'lightblue'],
								[1, 'white']
							]
						}
					}
				]
			})
			this.$('#tt-ajax').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime',
					title: {
						text: 'Date'
					}
				},
				yAxis: [{
					title: {
						text: 'tt-ajax'
					},
					min:0,
					max:ttAjaxMax
				}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						},
						animation: false
					}
				},
				legend: {
					enabled: false
				},
				series: [
					{
						name: 'tt.ajax',
						yAxis:0,
						data:ttAjax,
						color: "brown",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, 'red'],
								[1, 'white']
							]
						}
					}
				]
			})

		}
	})

	View.id = "views/project/project_view";
	return View;
})
