define(['tinybone/base','dustc!views/project-settings/pageRule_action_edit.dust'],function (tb) {
    var view = tb.View;
    var View = view.extend({
        id:"views/project-settings/pageRule_action_edit",
        events:{
            'click .deletePageRuleAction': function(e) {
				this.data._delete_mark = true;
				var index = _.findIndex(this.parent.data.actions, function (e) { return e._delete_mark; });
				this.parent.data.actions.splice(index,1);
				this.remove();
            }
		},
        ddx:function () {
			var d = this.data;
			try {
				new RegExp(this.$("#_s_matcher").val());
				self.$('#_s_matcher').closest('.form-group').removeClass('has-error').find("span").text("");
			} catch (e) {
				self.$('#_s_matcher').closest('.form-group').addClass('has-error').find("span").text(e.toString());
				return false;;
			}
			d._s_field = this.$("#_s_field").val();
			d._s_matcher = this.$("#_s_matcher").val();
			d._s_replacer = this.$("#_s_replacer").val();
			return true;
		}
    })
    View.id = "views/project-settings/pageRule_action_edit";
    return View;
})
