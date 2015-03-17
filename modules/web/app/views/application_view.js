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
              var transaction = $(e.currentTarget).html()
              var filter = this.data.fr
              filter.filter._s_name = transaction;

              safe.parallel([
                  function(cb) {
                      api("stats.asBreakDown", $.cookie("token"), filter, safe.sure(cb, function(data) {
                          trbreak.empty();
                          trbreak.append('<tr class=\"info\"><th>Part</th><th>Count</th><th>Time</th></tr>');
                          var sum = data[0].value[transaction]
                          _.forEach(data[0].value, function(data) {
                              var count = (data._i_cnt/sum._i_cnt).toFixed(2)
                              var proc = ((data._i_tt/sum._i_tt)*100).toFixed(1)
                              trbreak.append('<tr><td>'+data._s_name+'</td><td>'+count+'</td><td>'+proc+' %</td></tr>')
                          })
                      }))
                      cb()
                  },
                  function(cb) {
                      api("stats.getActions", $.cookie("token"), filter, safe.sure(cb, function(data) {

                          var actions = data;
                          var actflat = [], actprev = null
                          var quant = filter.quant;
                          var offset = new Date().getTimezoneOffset();
                          _.each(actions, function (a) {
                              if (actprev) {
                                  for (var i = actprev._id + 1; i < a._id; i++) {
                                      actflat.push({_id: i, value: null});
                                  }
                              }
                              actprev = a;
                              actflat.push(a);
                          })

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
                              ttServer.push([d, a.value?(a.value.tt)/1000:0]);
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
                                  type: 'datetime',
                                  title: {
                                      text: 'Date'
                                  }
                              },
                              yAxis: [{
                                  title: {
                                      text: 'rpm'
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
                                  type: 'datetime',
                                  title: {
                                      text: 'Date'
                                  }
                              },
                              yAxis: [{
                                  title: {
                                      text: 'time'
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
            var ajax = this.data.rpm;
        }
    })
    View.id = "views/application_view";
    return View;
})
