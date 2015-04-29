/**
 * Created by ivan on 4/27/15.
 */
define(['tinybone/base','dustc!templates/metrics.dust','highcharts'],function (tb) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/metrics",
        postRender:function(e){
            var quant = this.data.quant;
            var memory = this.data.mem;
            var self = this;
            var offset = new Date().getTimezoneOffset();
            var idx = 0

            var memflat = [], memprev = null;

            _.each(memory, function (m) {
                if (memprev) {
                    for (var i=memprev._id+1; i< m._id; i++) {
                        memflat.push({_id: i, value:null});
                    }
                }
                memprev = m;
                memflat.push(m);
            })

            var memrpm = [], ttTime=[];
            _.each(memflat, function (a) {
                var d = new Date(a._id*quant*25000);
                d.setMinutes(d.getMinutes()-offset);
                d = d.valueOf();
                var memrpm1 = a.value? a.value.mem:0;
                memrpm.push([d,memrpm1]);
            })

            self.$('#memory').highcharts({
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
                series: [
                    {
                        name: 'mem',
                        yAxis: 0,
                        data: memrpm,
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
    View.id = "views/metrics_view";
    return View;
})