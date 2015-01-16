define(['tinybone/base','highcharts'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"project/project",
		postRender:function () {
			view.prototype.postRender.call(this);
			var rpm = [],load=[],err=[],errp=[];
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
			rpmmax = 0;
			_.each(flat, function (v) {
				var d = new Date(v._id*quant*60000);
				d.setMinutes(d.getMinutes()-offset);
				d = d.valueOf();
				var rpm1 = parseInt(v.value?v.value.r:0);
				var rpmmax = Math.max(rpm1, rpmmax)
				rpm.push([d,rpm1]);
				load.push([d,parseInt(100*(v.value?(v.value.tt/1000):0))/100]);
				err.push([d,v.value?v.value.e:0]);
				errp.push([d,parseInt(10000*(v.value?(1.0*v.value.e/v.value.r):0))/100]);
			})

			rpmmax = parseInt(rpmmax/10)*10;

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
					}
				},
				yAxis: [
					{
						title: {
							text: 'rpm'
						},
						min:0,
						max:rpmmax
					},{
						title: {
							text: '%'
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
						color:"green"
					},{
						name: 'Absolute errors',
						yAxis:0,
						data:err,
						color:"lightblue"
					},{
						name: 'Relative Errors',
						yAxis:1,
						color:"red",
						data:errp
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
							text: 's'
						},
						min:0
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
						data:load
					}
				]
			})

		}
	})
})
