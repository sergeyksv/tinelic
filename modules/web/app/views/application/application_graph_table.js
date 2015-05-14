define(['tinybone/base', 'lodash',"tinybone/backadapter", "safe", 'dustc!views/application/application_graph_table.dust', 'highcharts','jquery.tablesorter.combined'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/application/application_graph_table",
		preRender: function () {
            var locals = this.locals;
            if (this.data.query) {
				locals.datapreRender = [];
				var self = this;
				var data = this.data.breakdown;
				var i=0;
				var sumtta = 0, sumowna = 0;
                var sumcnt = null;
                var percfortta = null;
                _.forEach(data, function(r) {
					sumtta += r.value.tta;
                    sumowna += r.value.owna;
                    if (self.data.query == r._id) {
						sumcnt = r.value.cnt;
						percfortta = r.value.tta;
					}
                });
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = (r.value.cnt/sumcnt).toFixed(2);
					locals.datapreRender[i].proc = ((r.value.tta/percfortta)*100);
                    locals.datapreRender[i].ownaproc = ((r.value.owna/sumowna)*100);
                    locals.datapreRender[i].tta = (r.value.tta/1000);
                    locals.datapreRender[i].owna = (r.value.owna/1000);
					i++;
				});
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var filter = this.data.fr;
			var actions = this.data.graphs;
            if (this.data.query) {
				var trbreak = self.$('#trbreak');
				trbreak.tablesorter({sortList: [[2,1]]});
			}
                          var actflat = [], actprev = null
                          var quant = filter.quant;
                          var offset = new Date().getTimezoneOffset();
                          var dtstart = self.data.fr.filter._dt.$gt/(quant*60000);
                          var dtend =  self.data.fr.filter._dt.$lte/(quant*60000);
                          if (dtstart != actions[0]._id) {
							actflat[0]={_id: dtstart, value:null}
							actflat[1]={_id: actions[0]._id-1, value:null}
						  }
                          _.each(actions, function (a) {
                              if (actprev) {
                                  for (var i = actprev._id + 1; i < a._id; i++) {
                                      actflat.push({_id: i, value: null});
                                  }
                              }
                              actprev = a;
                              actflat.push(a);
                          })
                          if (actions[actions.length-1]._id != dtend) {
							actflat[actflat.length]={_id: actions[actions.length-1]._id+1, value:null}
							actflat[actflat.length]={_id: dtend, value:null}
						  }

                          var actrpm1;
                          var actrpm = [];
                          var ttServer = [];
                          _.each(actflat, function (a) {
                              var apdex = a.value ? a.value.apdex : null
                              if (isFinite(apdex) == false) {
                                  apdex = null;
                              }
                              var d = new Date(a._id * quant * 60000);
                              d.setMinutes(d.getMinutes() - offset);
                              d = d.valueOf();
                              var actrpm1 = a.value ? a.value.r : 0;
                              actrpm.push([d, actrpm1]);
                              ttServer.push([d, a.value?(a.value.tta)/1000:0]);
                          })

                          var actrpmmax = _.max(actrpm, function (v) {
                              return v[1];
                          })[1];
                          var ttServerMax = _.max(ttServer, function (v) { return v[1]; })[1];

                          self.$('#rpm-one').highcharts({
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
                                      text: 'Throughput (rpm)'
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
                                      name: 'rpm',
                                      yAxis: 0,
                                      data: actrpm,
                                      color: "green",
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
                          self.$('#time-one').highcharts({
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
                                  min: 0,
                                  max: ttServerMax
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
                                      name: 'rpm',
                                      yAxis: 0,
                                      data: ttServer,
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
	View.id = "views/application/application_graph_table";
	return View;
})
