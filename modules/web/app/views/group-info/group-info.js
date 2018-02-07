define(['tinybone/base', 'lodash','tinybone/backadapter', 'safe','dustc!views/group-info/group-info.dust', 'jquery.tablesorter.combined'],function (tb,safe,tpl) {
	var view = tb.View;
	var View = view.extend({
		id:"views/group-info/group-info",
		events: {
			'click .more': function(e) {
		var self = this;
					e.preventDefault();
					if ($(e.currentTarget).text() == "Next") {
			this.locals.currentPage = parseInt(self.$('.findActive.active').text())+1;
		} else if ($(e.currentTarget).text() == "Prev") {
			this.locals.currentPage = parseInt(self.$('.findActive.active').text())-1;
		} else {
			this.locals.currentPage = parseInt($(e.currentTarget).html());
		}
		this.refresh(this.app.errHandler);
					return true;
			}
	},
		preRender: function () {
				var locals = this.locals;
				var project0 = this.data.teams.projects;
				var sortMap = {
												"name": "_t_proj.name",
												"dtlActions": "_t_proj.errAck.dtlActions",
												"dtlPages": "_t_proj.errAck.dtlPages",
												"ApdexServer": "_t_proj.apdex.server",
												"ApdexClient": "_t_proj.apdex.client",
												"ApdexAjax": "_t_proj.apdex.ajax",
												"ThroughputServer": "_t_proj.server.r",
												"ThroughputClient": "_t_proj.client.r",
												"ThroughputAjax": "_t_proj.ajax.r",
												"TimeServer": "_t_proj.server.etu",
												"TimeClient": "_t_proj.client.etu",
												"TimeAjax": "_t_proj.ajax.etu",
												"erateServer": "_t_proj.server.e",
												"erateClient": "_t_proj.client.e",
												"erateAjax": "_t_proj.ajax.e"
											};
				if	(this.data.sortType) {
					project0 = safe.sortBy(project0, sortMap[this.data.sortByF]);

					if (this.data.sortType == "desc")
						project0 = project0.reverse();

					this.data.teams.projects = project0;
				}
				if (!locals.pageCount) {
						// set default data
						locals.pageCount = Math.ceil(this.data.teams.projects.length/10);
						locals.currentPage = this.data.tmpCurPage;
				}
				// update paging helper variables
				locals.leftlistEnd = locals.currentPage*10-1;
				locals.leftlistBegin = locals.leftlistEnd-9;
				locals.paging = [];
				for (i=1; i<=locals.pageCount; i++) {
						locals.paging.push({index:i,selected:i==locals.currentPage});
				}
		},
		postRender:function () {
// zebra
			var trbreak = this.$('#trbreak');
			for (var i = 1; i < trbreak[0].rows.length; i+=2) {
				trbreak[0].rows[i].className = "odd";
			}
		}
	});
	View.id = "views/group-info/group-info";
  return View;
});
