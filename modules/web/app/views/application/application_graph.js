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
			var actrpm = this.data;
			var fixBegin = this.get('fixBegin')
			var fixEnd = this.get('fixEnd')

			var peremBegin=[];
			var j=0,k=0;
			// method Tukey for processing begin interval i.e 1 and 2 value
			for (var z=0; z<=1; z++) {
				for (var i=fixBegin; i<fixBegin+3; i++) {
					if (i == fixBegin+2) {
						peremBegin[j] = actrpm[i+z][1]?(3*peremBegin[1]-2*actrpm[i+z][1]):0;
					} else {
						peremBegin[j] = actrpm[i+z][1]?actrpm[i+z][1]:0;
					}
					j++;
				}
				peremBegin.sort();
				actrpm[fixBegin+z][1] = peremBegin[1];
				j=0;
			}
			// Median filter with odd window = 5
			while ((fixBegin != actrpm.length) && (fixBegin+5 < actrpm.length-1)) {
				for (var i=fixBegin; i<fixBegin+5; i++) {
					peremBegin[j]=actrpm[i][1]?actrpm[i][1]:0;
					j++;
				}
				peremBegin.sort();
				actrpm[fixBegin+2][1] = peremBegin[2];
				fixBegin++;
				j=0;
			}
			// method Tukey for processing end interval i.e for 2 last value
			j=0;
			for (var z=0; z<=1; z++) {
				for (var i=fixEnd; i>fixEnd-3; i--) {
					if (i == fixEnd-2) {
						peremBegin[j] = actrpm[i-z][1]?(3*peremBegin[1]-2*actrpm[i-z][1]):0;
					} else {
						peremBegin[j] = actrpm[i-z][1]?actrpm[i-z][1]:0;
					}
					j++;
				}
				peremBegin.sort();
				actrpm[fixEnd-z][1] = peremBegin[1];
				j=0;
			}
			var actrpmmax = _.max(actrpm, function (v) { return v[1]; })[1];

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
			      max: actrpmmax
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
			          data: actrpm,
			          color: this.get('color'),
			          type: 'area',
			          fillColor: {
			              linearGradient: {
			                  x1: 0,
			                  y1: 0,
			                  x2: 0,
			                  y2: 1
			              },
			              stops: [
			                  [0, this.get('fillColor')],
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
