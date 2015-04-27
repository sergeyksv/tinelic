/**
 * Created by ivan on 4/27/15.
 */
define(['tinybone/base','dustc!../../templates/settings/pageRule_action_edit.dust'],function (tb) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/settings/pageRule_action_edit"
    })
    View.id = "views/settings/pageRule_action_edit_view";
    return View;
})