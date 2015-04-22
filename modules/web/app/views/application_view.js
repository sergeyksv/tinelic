define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!templates/application.dust', 'highcharts'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/application",
        events: {
          'click .do-stats': function(e) {
              var self = this;
              $this = $(e.currentTarget);
              var h = window.location.pathname.split('/',5)
              this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
              return false;
          },
          'click .more': function(e) {
              var self = this;
              var trbreak = self.$('#trbreak')
              var transaction = $(e.currentTarget).html();
			  self.$('.more.leftlist').removeClass('leftlist');
			  $(e.currentTarget).addClass('leftlist');
              var filter = this.data.fr
              filter.filter._s_name = transaction;

              safe.parallel([
                  function(cb) {
                      api("stats.getActionsBreakdown", $.cookie("token"), filter, safe.sure(cb, function(data) {
                          trbreak.empty();
                          trbreak.append('<tr class=\"info\"><th>Part</th><th>Count</th><th>Time</th><th>Own Time</th></tr>');
                          data = _.sortBy(data, function(r) {
                              return r.value.tta*-1
                          })
                           var sumtta = 0; var sumowna = 0;
                            _.forEach(data, function(r) {
                                sumtta += r.value.tta
                                sumowna += r.value.owna
                            })
                          var sum = data[0].value
                          _.forEach(data, function(r) {
                              var count = (r.value.cnt/sum.cnt).toFixed(2)
                              var proc = ((r.value.tta/sumtta)*100).toFixed(1)
                              var owna = ((r.value.owna/sumowna)*100).toFixed(1)
                              r.value.tta = r.value.tta.toFixed(1)
                              r.value.owna = r.value.owna.toFixed(1)
                              trbreak.append('<tr><td>'+r._id+'</td><td>'+count+'</td><td>'+r.value.tta+' s / '+proc+' %</td><td>'+r.value.owna+' s / '+owna+' %</td></tr>')
                          })
                      }))
                      cb()
                  },
                  function(cb) {
                      api("stats.getActionsTimings", $.cookie("token"), filter, safe.sure(cb, function(data) {

                          var actions = data;
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
                      }))
                      cb()
                  }
              ])
          }
        },
        postRender:function () {
            view.prototype.postRender.call(this);
            var self = this;
			var filter = this.data.fr;
			api("stats.getActionsTimings", $.cookie("token"), this.data.fr, safe.sure(this.app.errHandler, function(data) {

                          var actions = data;
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
                      }))
        }
    })
    View.id = "views/application_view";
    return View;
})
