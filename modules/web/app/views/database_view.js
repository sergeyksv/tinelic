define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!templates/database.dust', 'highcharts'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/database",
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
                var p = $(e.currentTarget).html()
                var filter = this.data.fr
                filter.filter['data._s_name'] = p;

                safe.parallel([
                    function(cb) {
                        api("collect.postDbBreakdown", $.cookie("token"), filter, safe.sure(cb, function(data) {
                            var views = []
                            _.forEach(data, function(v){
                                var data = v.value.data.filter(function(r){return (r._s_name == p)})[0]
                                views.push({_id:v._id, value: {r: data._i_cnt, tt: data._i_tt}})
                            })
                            trbreak.empty();
                            trbreak.append('<tr class=\"info\"><th>Part</th><th>avg*req</th><th>Time</th></tr>');
                            var sum = 0;
                            _.forEach(views, function(r){
                                sum += r.value.tt
                            })
                            _.forEach(_.sortBy(views,function(r){return -1*r.value.tt}), function(data) {
                                trbreak.append('<tr><td>'+data._id+'</td><td>'+data.value.tt+'</td><td>'+((data.value.tt/sum)*100).toFixed(2)+' %</td></tr>')
                            })
                        }))
                        cb()
                    },
                    function(cb) {
                        api("collect.postDbViews", $.cookie("token"), filter, safe.sure(cb, function(data) {
                            var views = [];
                            _.forEach(data, function(v){
                                var data = v.value.data.filter(function(r){return (r._s_name == p)})[0]
                                views.push({_id:v._id, value: {r: data._i_cnt, tt: data._i_tt}})
                            })
                            var flat = [], prev = null
                            var quant = filter.quant;
                            var offset = new Date().getTimezoneOffset();
                            _.each(views, function (a) {
                                if (prev) {
                                    for (var i = prev._id + 1; i < a._id; i++) {
                                        flat.push({_id: i, value: null});
                                    }
                                }
                                prev = a;
                                flat.push(a);
                            })

                            var rpm1;
                            var rpm = [];
                            var ttBrowser = [];
                            _.each(flat, function (v) {
                                var d = new Date(v._id * quant * 60000);
                                d.setMinutes(d.getMinutes() - offset);
                                d = d.valueOf();
                                var rpm1 = v.value ? v.value.r : 0;
                                rpm.push([d, rpm1]);
                                ttBrowser.push([d, v.value?(v.value.tt/v.value.r):0]);
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
                                series: [
                                    {
                                        name: 'time',
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
    View.id = "views/database_view";
    return View;
})
