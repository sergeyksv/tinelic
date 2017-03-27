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
				if (!this.data.sortType) {
						;//console.log("this.data.sortType", this.data.sortType)
				} else {
					if (this.data.sortType == "asc") {
							if (this.data.sortByF == "name")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.name');
							if (this.data.sortByF == "dtlActions")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.errAck.dtlActions');
							if (this.data.sortByF == "dtlPages")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.errAck.dtlPages');
							if (this.data.sortByF == "ApdexServer")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.apdex.server');
							if (this.data.sortByF == "ApdexClient")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.apdex.client');
							if (this.data.sortByF == "ApdexAjax")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.apdex.ajax');
							if (this.data.sortByF == "ThroughputServer")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.server.r');
							if (this.data.sortByF == "ThroughputClient")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.client.r');
							if (this.data.sortByF == "ThroughputAjax")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.ajax.r');
							if (this.data.sortByF == "TimeServer")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.server.etu');
							if (this.data.sortByF == "TimeClient")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.client.etu');
							if (this.data.sortByF == "TimeAjax")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.ajax.etu');
							if (this.data.sortByF == "erateServer")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.server.e');
							if (this.data.sortByF == "erateClient")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.client.e');
							if (this.data.sortByF == "erateAjax")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.ajax.e');
					}
					if (this.data.sortType == "desc") {
							if (this.data.sortByF == "name")
								this.data.teams.projects = safe.sortBy(project0, '_t_proj.name').reverse();
								if (this.data.sortByF == "dtlActions")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.errAck.dtlActions').reverse();
								if (this.data.sortByF == "dtlPages")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.errAck.dtlPages').reverse();
								if (this.data.sortByF == "ApdexServer")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.apdex.server').reverse();
								if (this.data.sortByF == "ApdexClient")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.apdex.client').reverse();
								if (this.data.sortByF == "ApdexAjax")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.apdex.ajax').reverse();
								if (this.data.sortByF == "ThroughputServer")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.server.r').reverse();
								if (this.data.sortByF == "ThroughputClient")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.client.r').reverse();
								if (this.data.sortByF == "ThroughputAjax")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.ajax.r').reverse();
								if (this.data.sortByF == "TimeServer")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.server.etu').reverse();
								if (this.data.sortByF == "TimeClient")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.client.etu').reverse();
								if (this.data.sortByF == "TimeAjax")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.ajax.etu').reverse();
								if (this.data.sortByF == "erateServer")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.server.e').reverse();
								if (this.data.sortByF == "erateClient")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.client.e').reverse();
								if (this.data.sortByF == "erateAjax")
									this.data.teams.projects = safe.sortBy(project0, '_t_proj.ajax.e').reverse();
					}
				};
				if (!locals.pageCount) {
						// set default data
						locals.pageCount = Math.ceil(this.data.teams.projects.length/10);
						locals.currentPage = this.data.tmpCurPage;
						locals.sortField = this.data.sortByF;
						locals.sortType = this.data.sortType;
				}
				// update paging helper variables
				locals.leftlistEnd = locals.currentPage*10-1;
				locals.leftlistBegin = locals.leftlistEnd-9;
				locals.paging = [];
				for (i=1; i<=locals.pageCount; i++) {
						locals.paging.push({index:i,selected:i==locals.currentPage});
				};
		},
		postRender:function () {
			var trbreak = this.$('#trbreak');
//			trbreak.tablesorter();
			for (var i = 1; i < trbreak[0].rows.length; i+=2) {
				trbreak[0].rows[i].className = "odd";
			}
		}
	});
	View.id = "views/group-info/group-info";
  return View;
})
