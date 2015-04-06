define(['tinybone/base','safe','tinybone/backadapter','highcharts','dustc!templates/ajax_rpmGraph.dust'],function (tb,safe,api) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/ajax_rpmGraph",
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var ajax = this.data.rpm;
			var quant = this.data.fr.quant;
			this.on("CallGraph",function(_id, evt){
				var trbreak = self.$('#trbreak')
				var transaction = $(evt.currentTarget).html()
				var filter = this.data.fr
				filter.filter._s_name = transaction;
				api("stats.ajaxBreakDown", "public", filter, safe.sure(this.app.errHandler, function(data) {
					trbreak.empty();
                    trbreak.append('<tr class=\"info\"><th>Part</th><th>Count</th><th>Percent</th></tr>');
					var int=[] , k=null;
					for (var j=0; j<data[0].value.pag.length-1; j++) {
						if ((data[0].value.pag[j] != null) || (data[0].value.pag[j] != undefined)){
							(k==null)?k=0:k+=1
							int[k]={id:data[0].value.pag[j], col:1};
							for (var i=j+1; i< data[0].value.pag.length-1; i++){
								if 	(int[k].id == data[0].value.pag[i]){
									int[k].col+=1
									delete data[0].value.pag[i]
								}
							}
						}
					}
					int =_.sortBy(int, function(v){
						return -1*v.col;
					})
					var sum=0;
					_.each(int, function(v){
						sum+=v.col
					})
					var percent = sum/100;
					_.each(int, function (v) {
						v.perc = Math.round(v.col/percent);
					})
					_.forEach(int, function(data) {
                              trbreak.append('<tr><td>'+data.id+'</td><td>'+data.col+'</td><td>'+data.perc+' %</td></tr>')
                    })
				}))
						api("stats.getAjaxTimings","public",{quant:10,_idurl:_id, filter:{_idp:this.data.project._id,
						_dt:this.data.fr.filter._dt
						}},safe.sure(this.app.errHandler, function (r) {
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
									name: _id,
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
                                      name: _id,
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

						}))
			},this);
			api("stats.getAjaxTimings","public", this.data.fr ,safe.sure(this.app.errHandler, function (r) {
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

			}))
		}
	})
	View.id = "views/ajax_rpmGraph_view";
	return View;
})
