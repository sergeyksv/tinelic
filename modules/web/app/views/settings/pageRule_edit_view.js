/**
 * Created by ivan on 4/24/15.
 */
define(['tinybone/base','safe','dustc!../../templates/settings/pageRule_edit.dust'],function (tb,safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/settings/pageRule_edit",
        postRender:function(){
            var self = this;
            var $inc = self.$('.innerActions');
            safe.map(self.data.pageRule.actions,function(action,cb){
                require(["views/settings/pageRule_action_edit_view"],function(Action){
                    var a = new Action({app:self.app});
                    a.data = {action:action};
                    a.render(safe.sure(self.app.errHandler,function(text){
                        var $a = $(text);
                        self.views.push($a);
                        $inc.append($a);

                    }))
                },cb)
            },this.app.errHandler)
        },
        events: {
            'click .addAction': function(e) {
                var self = this;
                var $inc = self.$('.innerActions');
                require(["views/settings/pageRule_action_edit_view"],function(Action){
                    var a = new Action({app:self.app});
                    a.data = {action:[{
                        _s_field: 'No field',
                        _s_type: 'replacer',
                        _s_matcher: 'No matcher',
                        _s_replacer: 'No replacer'
                        }
                    ]};
                    a.render(safe.sure(self.app.errHandler,function(text){
                        var $a = $(text);
                        self.views.push($a);
                        $inc.append($a);
                    }))
                },this.app.errHandler)
            },
            'click .savePageRule':function(e){
                var self = this;
                var id = self.$(e.currentTarget).data('id');
                var data = {filter : {
                    'pageRules.$.actions':[],
                    'pageRules.$._s_condition':self.$('input[name="_s_condition"]').val()
                }};
                _.each(self.views,function(r){
                    var action = {};
                    _.each($(r).find('form').serializeArray(),function(v){
                        action[v.name] = v.value;
                    });
                    data.filter['pageRules.$.actions'].push(action);
                });
                data._id = id;
                self.trigger('saveRule',data);
            },
            'click .deletePageRuleAction': function(e) {
                var $this = $(e.currentTarget);
                $this.closest('.container-fluid').remove();
            }
        }
    });
    View.id = "views/settings/pageRule_edit_view";
    return View;
})