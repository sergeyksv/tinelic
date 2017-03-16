define(['tinybone/base','safe','dustc!views/index/index.dust'],function (tb,safe,tpl) {
	var view = tb.View;
	var View = view.extend({
		id:"views/index/index",
		postRender:function () {
			var $teams = this.$(".list-group-item");
			// autoexpand teams if we have less than 10 projects
			if ($teams.length<10) {
				this.$(".list-group-item.row").click();
			}
        }
	})
	View.id = "views/index/index";
  return View;
})
