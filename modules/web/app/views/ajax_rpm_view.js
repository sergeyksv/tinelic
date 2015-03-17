define(['tinybone/base', 'lodash', 'dustc!templates/ajax_rpm.dust', 'views/ajax_rpmGraph_view'],function (tb,_) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/ajax_rpm",
		postRender:function () {
			view.prototype.postRender.call(this);
			var ajax = this.data.rpm;
		},
		events:{
			'click .do-stats': function(e) {
              var self = this;
              $this = $(e.currentTarget);
              var h = window.location.pathname.split('/',5)
              this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
              return false;
			},
			"click .do-get-ajax": function (evt){
				var GraphView=null
				GraphView = _.find(this.views,function(v){
					return v.name == "views/ajax_rpmGraph_view";
				});
				if (GraphView) {
					GraphView.trigger("CallGraph", evt.currentTarget.innerHTML, evt)
				}
				return false;
			}
		}
	})
	View.id = "views/ajax_rpm_view";
	return View;
})
