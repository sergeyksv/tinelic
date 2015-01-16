define(['tinybone/base','highcharts'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"project/project",
		postRender:function () {
			view.prototype.postRender.call(this);
			var rpm = [],load=[],err=[];
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
			_.each(flat, function (v) {
				var d = v._id*quant*60000;
				rpm.push([d,v.value?v.value.r:0]);
				load.push([d,v.value?(v.value.tt/1000):0]);
				err.push([d,v.value?v.value.e:0]);
			})

			this.$('#pageviews').highcharts({
				chart: {
					type: 'spline'
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
							text: 'rpm'
						}
					}
				],
				series: [{
						name: 'Views',
						yAxis:0,
						data:rpm
					},{
						name: 'Errors',
						yAxis:0,
						data:err
					}
				]
			})
			this.$('#pagetime').highcharts({
				chart: {
					type: 'spline'
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
						}
					}
				],
				series: [{
						name: 'Time',
						data:load
					}
				]
			})

		}
	})
})
