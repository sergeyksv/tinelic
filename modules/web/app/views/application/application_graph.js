define(['tinybone/base', 'lodash',"tinybone/backadapter", "safe", 'dustc!views/application/application_graph.dust', 'highcharts','jquery.tablesorter.combined'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/application/application_graph",
		postRender:function () {
			view.prototype.postRender.call(this);
			var data = this.data;
			var plot = [];
			var factor = this.get('quant') * 60000;
			var dtstart = parseInt(new Date(this.get('dtstart')).valueOf()/factor);
			var dtend = parseInt(Math.min(new Date(this.get('dtend')).valueOf(),new Date().valueOf())/factor);
			var flen = this.get('filter-len',7);
			var halv = Math.floor(flen/2);
			var median = this.get('filter-median',true);
			var vfactor = this.get("plot-factor",1)

			// media (or average) filtration + with averages at the end
			var dt,i,fw=[],v,j,max=0;
			for (dt=dtstart,i=0; dt<dtend+halv; dt++) {
				if (dt<dtend) {
					if (data[i]._id == dt ) {
						fw.push(data[i].value[this.get('plot-value')]);
						i++;
					} else {
						fw.push(0);
					}
				} else
					fw.shift();

				if (fw.length>halv) {
					if (fw.length==flen && median) {
						v = fw.slice().sort()[halv];
					} else {
						for (j=0,sum=0; j<fw.length; j++) {
							sum+=fw[j];
						}
						v = sum/fw.length;
					}
					v*=vfactor;
					max = Math.max(v,max);
					plot.push([dt*factor,v!==0?v:null]);
				}
				if (fw.length ==flen)
					fw.shift();
			}

			this.$('#graph').highcharts({
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
			      max: this.get('plot-max') || max
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
			          data: plot,
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
