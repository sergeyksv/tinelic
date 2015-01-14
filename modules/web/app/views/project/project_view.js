define(['tinybone/base','highcharts'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"project/project",
		postRender:function () {
			view.prototype.postRender.call(this);
			var rpm = [],load=[];
			_.each(this.data.views, function (v) {
				rpm.push([v._id*60000,v.value.c]);
				load.push([v._id*60000,v.value.tt/1000]);
			})

			this.$('#pageviews').highcharts({
				chart: {
					type: 'spline'
				},
				title: {
					text: 'Page Views per minute (rpm)'
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
					},{
						title: {
							text: 's'
						}
					}
				],
				series: [{
						name: 'Pae Views',
						yAxis:0,
						data:rpm
					},{
						name: 'Page Time',
						yAxis:1,
						data:load
					}
				]
			})
		}
	})
})
