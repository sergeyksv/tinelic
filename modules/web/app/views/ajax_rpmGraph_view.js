define(['tinybone/base','safe','tinybone/backadapter','highcharts',
'dustc!templates/ajax_rpmGraph.dust'],function (tb,safe,api) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/ajax_rpmGraph",
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var ajax = this.data.rpm;
			var quant = this.data.quant;
			this.on("CallGraph",function(_id){
				var boole=1;
				api("collect.getAjaxRpm","public",{quant:10,_idurl:_id, Graph_bool:boole, filter:{_idp:this.data.project._id,
						_dtstart: this.data.dtstart,
						_dtend: this.data.dtend}},safe.sure(this.app.errHandler, function (r) {
							var offset = new Date().getTimezoneOffset();
							var ajflat = [], ajprev = null;
							_.each(r, function (a) {
								if (ajprev) {
									for (var i=ajprev._id+1; i< a._id; i++) {
										ajflat.push({_id: i, value:null});
									}
								}
								ajprev = a;
								ajflat.push(a);
							})
							var ajrpm = []	
							_.each(ajflat, function (a) {
								var d = new Date(a._id*quant*60000);
								d.setMinutes(d.getMinutes()-offset);
								d = d.valueOf();
								var ajrpm1 = a.value? a.value.r:0;
								ajrpm.push([d,ajrpm1]);
							})
							this.$('#Ajax_rpm_Graph').highcharts({
								chart: {
									type: 'spline',
									zoomType: 'x'
								},
								title: {
									text: ''
								},
								xAxis: {
									type:'datetime',
									title: {
										text: 'Date'
									}
								},
								yAxis: [{
									title: {
										text: 'rpm'
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
								series: [{
									name: _id,
									data:ajrpm,
									color:"lightgreen"
								}
								]
							})
				}))
			},this);
		}
	})
	View.id = "views/ajax_rpmGraph_view";
	return View;
})
