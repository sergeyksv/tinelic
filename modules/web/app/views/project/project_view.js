define(['tinybone/base','highcharts'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"project/project",
		postRender:function () {
			view.prototype.postRender.call(this);
			var rpm = [],load=[],err=[];
			_.each(this.data.views, function (v) {
				rpm.push([v._id*60000,v.value.c]);
				load.push([v._id*60000,v.value.tt/1000]);
				err.push([v._id*60000,100.0*v.value.e/v.value.c]);
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
					},{
						title: {
							text: '%'
						}
					}
				],
				series: [{
						name: 'Views',
						yAxis:0,
						data:rpm
					},{
						name: 'Time',
						yAxis:1,
						data:load
					},{
						name: 'Errors',
						yAxis:2,
						data:err
					}
				]
			})
		}
	})
})
