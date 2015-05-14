define(['tinybone/base', 'lodash',"tinybone/backadapter", "safe", 'dustc!views/pages/pages_graph_table.dust', 'highcharts','jquery.tablesorter.combined'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/pages/pages_graph_table",
		preRender: function () {
            var locals = this.locals;
            if (this.data.query) {
				locals.datapreRender = [];
				var self = this;
				var data = this.data.breakdown;
				var i=0;
				var sumtta = 0;
                _.forEach(data, function(r) {
					sumtta += r.value.tta;
                })
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = r.value.c
					locals.datapreRender[i].proc = (r.value.tta/sumtta)*100
                    locals.datapreRender[i].tta = (r.value.tta/1000)
					i++;
				})
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var filter = this.data.fr;
			var views = this.data.graphs;
            if (this.data.query) {
				var trbreak = self.$('#trbreak');
				trbreak.tablesorter({sortList: [[2,1]]});
			}
                            var flat = [], prev = null
                            var quant = filter.quant;
                            var offset = new Date().getTimezoneOffset();
                            var dtstart = self.data.fr.filter._dt.$gt/(quant*60000);
                            var dtend =  self.data.fr.filter._dt.$lte/(quant*60000);
                            if (dtstart != views[0]._id) {
								flat[0]={_id: dtstart, value:null}
								flat[1]={_id: views[0]._id-1, value:null}
							}
                            _.each(views, function (a) {
                                if (prev) {
                                    for (var i = prev._id + 1; i < a._id; i++) {
                                        flat.push({_id: i, value: null});
                                    }
                                }
                                prev = a;
                                flat.push(a);
                            })
                            if (views[views.length-1]._id != dtend) {
								flat[flat.length]={_id: views[views.length-1]._id+1, value:null}
								flat[flat.length]={_id: dtend, value:null}
							}

                            var rpm1;
                            var rpm = [];
                            var ttBrowser = [];
                            _.each(flat, function (v) {
                                var apdex = v.value ? v.value.apdex : null
                                if (isFinite(apdex) == false) {
                                    apdex = null;
                                }
                                var d = new Date(v._id * quant * 60000);
                                d.setMinutes(d.getMinutes() - offset);
                                d = d.valueOf();
                                var rpm1 = v.value ? v.value.r : 0;
                                rpm.push([d, rpm1]);
                                ttBrowser.push([d, v.value?(v.value.tta/1000):0]);
                            })

                            var rpmmax = _.max(rpm, function (v) {
                                return v[1];
                            })[1];
                            var ttBrowserMax = _.max(ttBrowser, function (v) { return v[1]; })[1];

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
                                    max: rpmmax
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
                                        data: rpm,
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
                                    max: ttBrowserMax
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
                                        data: ttBrowser,
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
	View.id = "views/pages/pages_graph_table";
	return View;
})
