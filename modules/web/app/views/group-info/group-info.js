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
					return false;
			}
		},
		preRender: function () {
				var locals = this.locals;
				var data = this.data;
				var i;
				if (!locals.pageCount) {
						// set default data
						locals.pageCount = Math.ceil(data.teams.projects.length/10);
						var selIndex = 0;
						for (i=0; i<data.teams.projects.length; i++) {
								if (data.teams.projects[i]._idp == data.query) {
										selIndex = i;
										break;
								}
						}
						locals.currentPage = 1+Math.floor(selIndex/10);
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
				var trbreak = self.$('#trbreak');
				trbreak.tablesorter();
}})
	View.id = "views/group-info/group-info";
  return View;
})
