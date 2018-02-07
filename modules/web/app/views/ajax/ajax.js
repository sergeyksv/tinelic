define(['tinybone/base', 'lodash', 'dustc!views/ajax/ajax.dust', 'views/ajax/ajax_graph_table'],function (tb,_) {
	var view = tb.View;
	var View = view.extend({
		id:"views/ajax/ajax",
		events:{
			'click .do-stats': function(e) {
              var self = this;
              $this = $(e.currentTarget);
              var h = window.location.pathname.split('/',5);
              this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
              return false;
			}
		}
	});
	View.id = "views/ajax/ajax";
	return View;
});
