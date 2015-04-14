define(['tinybone/base','lodash',"tinybone/backadapter",'dustc!templates/settings.dust'],function (tb,_,api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/settings",
        events: {
            "click .edit": function(e){
                var self = this
                var form = self.$('form[id="'+$(e.currentTarget).data("type")+'"]')
                form.find("span").toggle()
                form.find("input").toggle()
                form.find("div[type='submit']").toggle()
            },
            'click .send': function(e) {
                var self = this;
                var array = $("#"+self.$(e.currentTarget).data('send')).serializeArray()
                var data = {filter : {}}
                data._id = self.$("#_id").data('id')

                if (self.$(e.currentTarget).data('send') == 'apdexT') {
                    data.filter.apdexConfig = {}
                    _.forEach(array,function(obj) {
                        data.filter.apdexConfig[obj.name] = obj.value
                    })
                }
                else {
                    _.forEach(array,function(obj) {
                        data.filter[obj.name] = obj.value
                    })
                }

                api("assets.saveProjectsConfig", $.cookie("token"),data, function(err,data){
                    if (err)
                        alert(err)
                    else {
                        api.invalidate();
                        self.app.router.reload();
                    }
                })

            }
        }
    })
    View.id = "views/settings_view";
    return View;
})