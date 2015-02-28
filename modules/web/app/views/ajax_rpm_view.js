define(['tinybone/base', 'lodash', 'dustc!templates/ajax_rpm.dust', 
'views/ajax_rpmGraph_view'],function (tb,_) {
	var view = tb.View;
	var GraphView=null
	var View = view.extend({
		id:"templates/ajax_rpm",
		postRender:function () {
			view.prototype.postRender.call(this);
			var ajax = this.data.rpm;
			GraphView = _.find(this.views,function(v){
				return v.name == "views/ajax_rpmGraph_view";
			}).view;
		},
		events:{
			"click .do-get-ajax": function (evt){
				if (GraphView) {
					GraphView.trigger("CallGraph",this.data.rpm[evt.currentTarget.attributes[1].value]._id)
				}
				return false;
			}
		}
	})
	View.id = "views/ajax_rpm_view";
	return View;
})
