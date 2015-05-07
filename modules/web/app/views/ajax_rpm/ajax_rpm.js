define(['tinybone/base', 'lodash', 'dustc!views/ajax_rpm/ajax_rpm.dust', 'views/ajax_rpm/ajax_rpmGraph'],function (tb,_) {
	var view = tb.View;
	var View = view.extend({
		id:"views/ajax_rpm/ajax_rpm",
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
				var self = this;
				self.$('.do-get-ajax.leftlist').removeClass('leftlist');
				$(evt.currentTarget).addClass('leftlist');
				var GraphView=null;
				GraphView = _.find(this.views,function(v){
					return v.name == "views/ajax_rpm/ajax_rpmGraph";
				});
				if (GraphView) {
					GraphView.trigger("CallGraph", evt.currentTarget.innerHTML, evt)
				}
				return false;
			}
		}
	})
	View.id = "views/ajax_rpm/ajax_rpm";
	return View;
})
