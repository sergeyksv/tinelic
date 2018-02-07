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
                });
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = r.value.c;
					locals.datapreRender[i].proc = (r.value.tta/sumtta);
                    locals.datapreRender[i].tta = (r.value.tta/1000);
					i++;
				});
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var filter = this.data.fr;
			var views = this.data.graphs;
            if (this.data.query) {
				var trbreak = self.$('#trbreak');
					$.tablesorter.addParser({
						id : 'longPercent',
						is : function( str ) {
							return /\d+\s\w+\s\/\s\d+\s/%( str );
						},
						format : function( str ) {
							var e = str.split('/');
							return $.tablesorter.formatFloat((str != "/") ?(e[1]):("/"));
						},
						type : 'numeric'
					});
				trbreak.tablesorter({sortList: [[2,1]],
					headers: {
						2:{
							sorter:"longPercent"
						}
					}
				});
			}
		}
	});
	View.id = "views/pages/pages_graph_table";
	return View;
});
