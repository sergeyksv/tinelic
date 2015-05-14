define(['tinybone/base','safe','tinybone/backadapter','lodash','highcharts','dustc!views/ajax/ajax_graph_table.dust','jquery.tablesorter.combined'],function (tb,safe,api,_) {
	var view = tb.View;
	var View = view.extend({
		id:"views/ajax/ajax_graph_table",
		preRender: function () {
            var locals = this.locals;
            if (this.data.query) {
				locals.datapreRender = [];
				var self = this;
				var data = this.data.breakdown;
				var i=0;
				var sumtta = 0;
                var percfortta = null;
                _.forEach(data, function(r) {
					sumtta += r.value.tta;
                })
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = r.value.c
					locals.datapreRender[i].proc = (r.value.tta/sumtta)*100
                    locals.datapreRender[i].tta = r.value.tta/1000
					i++;
				})
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			//var ajax = this.data.rpm;
			var filter = this.data.fr
			var quant = this.data.fr.quant;
			var r = this.data.graphs;
			if (this.data.query) {
				var trbreak = self.$('#trbreak');
				trbreak.tablesorter({sortList: [[2,1]]});
			}
							var offset = new Date().getTimezoneOffset();
							var ajflat = [], ajprev = null;
							var dtstart = self.data.fr.filter._dt.$gt/(quant*60000);
							var dtend =  self.data.fr.filter._dt.$lte/(quant*60000);
							if (dtstart != r[0]._id) {
								ajflat[0]={_id: dtstart, value:null}
								ajflat[1]={_id: r[0]._id-1, value:null}
							}
							_.each(r, function (a) {
								if (ajprev) {
									for (var i=ajprev._id+1; i< a._id; i++) {
										ajflat.push({_id: i, value:null});
									}
								}
								ajprev = a;
								ajflat.push(a);
							})
							if (r[r.length-1]._id != dtend) {
								ajflat[ajflat.length]={_id: r[r.length-1]._id+1, value:null}
								ajflat[ajflat.length]={_id: dtend, value:null}
							}
							var ajrpm = [], ttTime=[];
							_.each(ajflat, function (a) {
								var d = new Date(a._id*quant*60000);
								d.setMinutes(d.getMinutes()-offset);
								d = d.valueOf();
								var ajrpm1 = a.value? a.value.r:0;
								ajrpm.push([d,ajrpm1]);
								ttTime.push([d, a.value?(a.value.tta/1000):0]);
							})
							this.$('#rpm-one').highcharts({
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
									title: {
										text: 'Throughput (rpm)'
									},
									min:0
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
								series: [{
									name: "rpm",
									data:ajrpm,
									color:"green",
									type: 'area',
									fillColor: {
                                          linearGradient: {
                                              x1: 0,
                                              y1: 0,
                                              x2: 0,
                                              y2: 1
                                          },
                                          stops: [
                                              [0, 'lightgreen'],
                                              [1, 'white']
                                          ]
                                      }
								}
								]
							})
							this.$('#time-one').highcharts({
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
                                      text: 'Timing (s)'
                                  },
                                  min: 0
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
                                      name: "time",
                                      yAxis: 0,
                                      data: ttTime,
                                      color: "blue",
                                      type: 'area',
                                      fillColor: {
                                          linearGradient: {
                                              x1: 0,
                                              y1: 0,
                                              x2: 0,
                                              y2: 1
                                          },
                                          stops: [
                                              [0, 'lightblue'],
                                              [1, 'white']
                                          ]
                                      }
                                  }
                              ]
							})
		}
	})
	View.id = "views/ajax/ajax_graph_table";
	return View;
})
