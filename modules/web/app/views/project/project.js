define(['tinybone/base','lodash','moment/moment',"tinybone/backadapter",'highcharts',
	'dustc!views/project/project.dust'],function (tb,_,moment,api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/project",
		events: {
			'click #acknowledge': function(e) {
				var self = this;
				var router = self.app.router;
				var id = self.$("span[data-id]").data('id')
				api('assets.pullErrAck', $.cookie('token'),{type:['_dtPagesErrAck','_dtActionsErrAck'],_id:id}, function(err, data) {
					if (err)
						alert(err)
					else {
						api.invalidate()
						router.reload();

					}
				})
			}
		},
		postRender:function () {
			view.prototype.postRender.call(this);
			var errorsView = _.find(this.views,function(v){
				return v.name == "views/project/errors_view";
			});
		}
	})

	View.id = "views/project/project";
	return View;
})
