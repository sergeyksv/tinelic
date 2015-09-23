define(['require','tinybone/base','safe','lodash','dustc!views/project-settings/pageRule_edit.dust'],function (require,tb,safe,_) {
    var view = tb.View;
    var View = view.extend({
        id:"views/project-settings/pageRule_edit",
        events: {
            'click .addAction': function(e) {
                var self = this;
                var $inc = self.$('#addPlaceHolder');
                require(["views/project-settings/pageRule_action_edit"],function(Action){
                    var a = new Action({app:self.app});
                    a.data = {
                        _s_type: 'replacer'
                    };
                    if (!_.isArray(self.data.actions))
						self.data.actions = [];
                    self.data.actions.push(a.data);
                    a.render(safe.sure(self.app.errHandler,function(text){
                        var $a = $(text);
                        $inc.before($a);
                        a.bindDom($a);
                        self.attachSubView(a);
                    }))
                },this.app.errHandler)
            },
            'click .doCancel': function(e) {
				this.trigger('cancel');
            },
            'click .doSave':function(e){
                var self = this;
				var hasError = false;
                var condition = self.$('#_s_condition').val();
                try {
					JSON.parse(condition);
					self.$('#_s_condition').closest('.form-group').removeClass('has-error').find("span").text("");
				} catch (e) {
					self.$('#_s_condition').closest('.form-group').addClass('has-error').find("span").text(e.toString());
					hasError = true;
				}
                _.each(self.views,function(r) {
					hasError|=!r.ddx();
                });
                this.data._s_condition = condition;

				if (!hasError)
					self.trigger('save');
            }
        }
    });
    View.id = "views/project-settings/pageRule_edit";
    return View;
})
