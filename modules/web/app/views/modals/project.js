define(['tinybone/base','bootstrap/modal','tinybone/backadapter','safe','dustc!templates/modals/project.dust'],function (tb,modal,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"templates/modals/project",
		postRender:function () {
			view.prototype.postRender.call(this);
			this.$('.modal').modal({});
		},
		events:{
			"click .do-close":function (e) {
				e.preventDefault();
				this.remove();
			},
			"click .do-save":"doSave",
			"submit form":"doSave"
		},
		doSave:function (e) {
			var self = this;
			e.preventDefault();
			var project = {
				name:this.$("#name").val()
			}
			api("assets.saveProject","public",{project:project}, safe.sure(this.app.errHandler, function () {
				api.invalidate();
				self.remove();
				self.trigger("saved");
			}))
		}
	})
	View.id = "views/modals/project";
	return View;
})
