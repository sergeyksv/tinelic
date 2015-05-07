/**
 * Created by ivan on 5/7/15.
 */
define(['tinybone/base','dustc!views/project-settings/stroke_edit.dust'],function (tb) {
    var view = tb.View;
    var View = view.extend({
        id:"views/project-settings/stroke_edit",
        events:{
            "click .doSaveStroke":function(e) {
                var self = this;
                var data = {filter:self.data}
                data.filter[self.$('input').prop('name')] = self.$('input').val();
                this.trigger('save',data)
            },
            "click .doCancel": function(e) {
                this.trigger('cancel');
            }
        }
    })
    View.id = "views/project-settings/stroke_edit";
    return View;
})