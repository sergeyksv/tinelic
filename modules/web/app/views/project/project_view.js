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
			}).view;
			var rpm = [],load=[],errp=[];
			var views = this.data.views;
			views = _.sortBy(views, function (v) { return v._id; });
			var flat = [],prev = null;
			_.each(views, function (v) {
				if (prev) {
					for (var i=prev._id+1; i<v._id; i++) {
						flat.push({_id:i,value:null})
					}
				}
				prev = v;
				flat.push(v);
			})
			var quant = this.data.quant;
			var offset = new Date().getTimezoneOffset();
			_.each(flat, function (v) {
				var d = new Date(v._id*quant*60000);
				d.setMinutes(d.getMinutes()-offset);
				d = d.valueOf();
				var rpm1 = v.value?v.value.r:0;
				rpm.push([d,rpm1]);
				load.push([d,parseInt(100*(v.value?(v.value.tt/1000):0))/100]);
				errp.push([d,parseInt(10000*(v.value?(1.0*v.value.e/v.value.r):0))/100]);
			})

			function meanFilter(arr,window) {
				var rpmf = [];
				var sample = [];
				_.each(arr, function (v) {
					sample.push(v);
					var m = null;
					if (sample.length>window/2) {
						var ordered = _.sortBy(sample, function (v) { return v[1]; });
						m = ordered[5][1]
						if (sample.length>window)
							sample.shift();
						if (rpmf[0][1]===null) {
							for (var i=0;i<window/2;i++) {
								rpmf[i][1]=m;
							}
						}
					}
					rpmf.push([v[0],m]);
				})
				return rpmf;
			}

			var rpmf = meanFilter(rpm, 10);
			var errpf = meanFilter(errp, 10);
			var loadf = meanFilter(load, 10);
			var loadmax = _.max(loadf, function (v) { return v[1]; })[1];
			var rpmmax = _.max(rpmf, function (v) { return v[1]; })[1];

			rpmmax = parseInt((rpmmax+1)/10)*10;

			this.$('#pageviews').highcharts({
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
					},
					events:{
						afterSetExtremes:function(e){
							errorsView.trigger("updateRange",moment.utc(e.min).format(),moment.utc(e.max).format());
						}
					}
				},
				yAxis: [
					{
						title: {
							text: null
						},
						min:0,
						max:rpmmax
					},{
						title: {
							text: null
						},
						labels: {
						   enabled: false
						},
						max:100,
						min:0,
						tickPixelInterval: 25
					}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						}
					}
				},
				series: [{
						name: 'Views',
						yAxis:0,
						data:rpm,
						color:"lightgreen"
					},{
						name: 'Views Filtered',
						yAxis:0,
						data:rpmf,
						color:"green"
					},{
						name: '% Errors',
						yAxis:1,
						color:"pink",
						data:errp
					},{
						name: '% Errors Filtered',
						yAxis:1,
						color:"red",
						data:errpf
					}
				]
			})
			this.$('#pagetime').highcharts({
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
							text: null
						},
						min:0,
						max:loadmax
					}
				],
				plotOptions: {
					series: {
						marker: {
							enabled: false
						}
					}
				},
				series: [{
						name: 'Time',
						data:load,
						color: "lightblue"
					},
					{
						name: 'Time',
						data:loadf,
						color: "blue"
					}
				]
			})

		}
	})

	View.id = "views/project/project_view";
	return View;
})
