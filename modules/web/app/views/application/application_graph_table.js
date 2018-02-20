define(['tinybone/base', 'lodash',"tinybone/backadapter", "safe", 'dustc!views/application/application_graph_table.dust', 'highcharts','jquery.tablesorter.combined'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/application/application_graph_table",
		preRender: function () {
            var locals = this.locals = {};
			var self = this;
            if (this.data.query) {
				locals.datapreRender = [];
				var data = this.data.breakdown;
				var i=0;
				var sumtta = 0, sumowna = 0;
                var sumcnt = null;
                var percfortta = null;
                _.forEach(data, function(r) {
					sumtta += r.value.tta;
                    sumowna += r.value.owna;
                    if (self.data.query == r._id) {
						sumcnt = r.value.cnt;
						percfortta = r.value.tta;
					}
                });
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = (r.value.cnt/sumcnt).toFixed(2);
					locals.datapreRender[i].proc = (r.value.tta/percfortta);
                    locals.datapreRender[i].ownaproc = (r.value.owna/sumowna);
                    locals.datapreRender[i].tta = (r.value.tta/1000);
                    locals.datapreRender[i].owna = (r.value.owna/1000);
					i++;
				});
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var filter = this.data.fr;
			var actions = this.data.graphs;
			var next_cat = [];
            if (this.data.query) {
				var h = window.location.pathname.split('/',4);
				_.forEach(this.data.breakdown, function(r) {
					next_cat.push(r._s_cat);
				});
				self.$('td:first-child').each(function(el) {
					var value = $(this).html();
					$(this).html('<a href=" /'+h[1]+'/'+h[2]+'/'+h[3]+'/'+"database/req?cat="+next_cat[el]+'&selected='+value+'">' + value + '</a>');
				});
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
						},
						3:{
							sorter:"longPercent"
						}
					}
				});
			}
		}
	});
	View.id = "views/application/application_graph_table";
	return View;
});
