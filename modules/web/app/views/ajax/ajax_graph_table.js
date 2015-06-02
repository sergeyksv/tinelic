define(['tinybone/base','safe','tinybone/backadapter','lodash','highcharts','dustc!views/ajax/ajax_graph_table.dust','jquery.tablesorter.combined'],function (tb,safe,api,_) {
	var view = tb.View;
	var View = view.extend({
		id:"views/ajax/ajax_graph_table",
		preRender: function () {
            var locals = this.locals;
            if (this.data.query) {
				locals.datapreRender = [];
				var self = this;
				var data = this.data.breakdown;
				var i=0;
				var sumtta = 0;
                var percfortta = null;
                _.forEach(data, function(r) {
					sumtta += r.value.tta;
                })
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = r.value.c
					locals.datapreRender[i].proc = (r.value.tta/sumtta)*100
                    locals.datapreRender[i].tta = r.value.tta/1000
					i++;
				})
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			//var ajax = this.data.rpm;
			var filter = this.data.fr
			var quant = this.data.fr.quant;
			var r = this.data.graphs;
			if (this.data.query) {
				var trbreak = self.$('#trbreak');
				trbreak.tablesorter({sortList: [[2,1]],
					headers: {
						2:{
							sorter:"longPercent"
						}
					}
				});
			}
		}
	})
	View.id = "views/ajax/ajax_graph_table";
	return View;
})
