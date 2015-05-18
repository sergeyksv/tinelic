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

                          self.$('#apdex-one').highcharts({
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
                                      text: 'Throughput(apdex)'
                                  },
                                  min: 0,
                                  max: data.actapdexMax
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
                                      name: 'apdex',
                                      yAxis: 0,
                                      data: data.actapdex,
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
                                              [0, '#F2CAC8'],
                                              [1, 'white']
                                          ]
                                      }
                                  }
                              ]
                          })
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
                                  max: data.actrpmmax
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
                                      data: data.actrpm,
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
                                  max: data.ttServerMax
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
                                      data: data.ttServer,
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
	View.id = "views/application/application_graph";
	return View;
})
