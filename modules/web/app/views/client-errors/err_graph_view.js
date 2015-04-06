define(['tinybone/base', 'lodash',"tinybone/backadapter","safe",'highcharts', 'dustc!templates/client-errors/err_graph.dust'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/client-errors/err_graph",
        postRender:function () {
				view.prototype.postRender.call(this);
				var message=(this.parent.data.event.event)? this.parent.data.event.event._s_message : "err";
				var quant = this.parent.data.fr.quant;
				var offset = new Date().getTimezoneOffset();
				var errflat = [], errprev = null;
				var dtstart = this.parent.data.fr.filter._dt.$gt/(quant*60000);
                var dtend =  this.parent.data.fr.filter._dt.$lte/(quant*60000);
				if (dtstart != this.data[0]._id) {
					errflat[0]={_id: dtstart, value:null}
					errflat[1]={_id: this.data[0]._id-1, value:null}
				}
				_.each(this.data, function (a) {
					if (errprev) {
						for (var i=errprev._id+1; i< a._id; i++) {
							errflat.push({_id: i, value:null});
						}
					}
					errprev = a;
					errflat.push(a);
				})
				if (this.data[this.data.length-1]._id != dtend) {
					errflat[errflat.length]={_id: this.data[this.data.length-1]._id+1, value:null}
					errflat[errflat.length]={_id: dtend, value:null}
				}
				var rpmerr = [];
				_.each(errflat, function (a) {
					var d = new Date(a._id*quant*60000);
					d.setMinutes(d.getMinutes()-offset);
					d = d.valueOf();
					var errrpm1 = a.value? a.value.r:0;
					rpmerr.push([d,errrpm1]);
				})
				this.$('#rpm-err').highcharts({
					chart:{
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
							text: 'Throughput(rpm)'
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
						name: message,
						data:rpmerr,
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
		}
    })
    View.id = "views/client-errors/err_graph_view";
    return View;
})
