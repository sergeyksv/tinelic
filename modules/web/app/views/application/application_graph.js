define(['tinybone/base', 'lodash',"tinybone/backadapter", "safe", 'dustc!views/application/application_graph.dust', 'highcharts','jquery.tablesorter.combined'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/application/application_graph",
		preRender: function () {
            var locals = this.locals;
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var data = this.data;

			self.$('#graph').highcharts({
			  chart: {
			      type: 'spline',
			      zoomType: 'x'
			  },
			  title: {
			      text: ''
			  },
			  xAxis: {
			      type: 'datetime'
			  },
			  yAxis: [{
			      title: {
			          text: this.get('name')
			      },
			      min: 0,
			      max: this.get('max')
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
			  credits: {
						enabled: false
			  },
			  series: [
			      {
			          name: this.locals.name,
			          yAxis: 0,
			          data: data,
			          color: "brown",
			          type: 'area',
			          fillColor: {
			              linearGradient: {
			                  x1: 0,
			                  y1: 0,
			                  x2: 0,
			                  y2: 1
			              },
			              stops: [
			                  [0, this.get('color')],
			                  [1, 'white']
			              ]
			          }
			      }
			  ]
			});
		}
	});
	View.id = "views/application/application_graph";
	return View;
});
