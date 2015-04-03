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
				ttBrowser.push([d, v.value?(v.value.tta/1000):0]);
			})

			var ajrpm = [];
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
				ttAjax.push([d, a.value?(a.value.tta/1000):0]);
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
				ttServer.push([d, a.value?(a.value.tta)/1000:0]);
			})

			var rpmMax = _.max(rpm, function (v) { return v[1]; })[1];
			var ajrpmMax = _.max(ajrpm, function (v) { return v[1]; })[1];
			var actrpmMax = _.max(actrpm, function (v) { return v[1]; })[1];
			var ttServerMax = _.max(ttServer, function (v) { return v[1]; })[1];
			var ttBrowserMax = _.max(ttBrowser, function (v) { return v[1]; })[1];
			var ttAjaxMax = _.max(ttAjax, function (v) { return v[1]; })[1];

			// rpm ajrpm actrpm,
			this.$('#thr-server').highcharts({
				chart: {
					type: 'spline',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime'

				},
				yAxis: [{
					min:0,
					max:actrpmMax,
					title: {
						style: {
							"display":"none"
						}
					}
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
						name: 'SERVER',
						data: actrpm,
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
								[0, '#F2CAC8'],
								[1, 'white']
							]
						}
					}

				]
			})
			this.$('#thr-browser').highcharts({
				chart: {
					type: 'spline',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime'

				},
				yAxis: [{
					min:0,
					max:rpmMax,
					title: {
						style: {
							"display":"none"
						}
					}
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
						name: 'rpm-browser',
						data: rpm,
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
			this.$('#thr-ajax').highcharts({
				chart: {
					type: 'spline',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime'

				},
				yAxis: [{
					min:0,
					max:ajrpmMax,
					title: {
						style: {
							"display":"none"
						}
					}
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
						name: 'rpm-ajax',
						data: ajrpm,
						color: "lightblue",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, "#CBE0F7"],
								[1, 'white']
							]
						}
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
					type:'datetime'

				},
				yAxis: [{
					min:0,
					max:1,
					title: {
						style: {
							"display":"none"
						}
					}
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
						color: "lightblue",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, "#CBE0F7"],
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
					type:'datetime'

				},
				yAxis: [{
					min:0,
					max:1,
					title: {
						style: {
							"display":"none"
						}
					}
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
			this.$('#apdex-server').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime'

				},
				yAxis: [{
					min:0,
					max:1,
					title: {
						style: {
							"display":"none"
						}
					}
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
								[0, '#F2CAC8'],
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
					type:'datetime'
				},
				yAxis: [{
					min:0,
					max:ttServerMax,
					title: {
						style: {
							"display":"none"
						}
					}
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
								[0, '#F2CAC8'],
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
					type:'datetime'
				},
				yAxis: [{
					min:0,
					max:ttBrowserMax,
					title: {
						style: {
							"display":"none"
						}
					}
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
			this.$('#tt-ajax').highcharts({
				chart: {
					type: 'line',
					zoomType: 'x'
				},
				title: {
					text: ''
				},
				xAxis: {
					type:'datetime'
				},
				yAxis: [{
					min:0,
					max:ttAjaxMax,
					title: {
						style: {
							"display":"none"
						}
					}
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
						color: "lightblue",
						type: 'area',
						fillColor : {
							linearGradient : {
								x1: 0,
								y1: 0,
								x2: 0,
								y2: 1
							},
							stops : [
								[0, "#CBE0F7"],
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
