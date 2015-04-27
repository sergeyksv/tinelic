define(['tinybone/base','lodash',"tinybone/backadapter",'safe','dustc!../../templates/settings/settings.dust'],function (tb,_,api,safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/settings/settings",
        events: {
            "click .cancel":function(e) {
                var self = this;
                api.invalidate();
                self.app.router.reload();
            },
            "click #deleteProject": function(e) {
                var self = this;
                var c = confirm('Do you really want delete this project and all of its data?');
                if (c) {
                    var id = {_idp:self.$("#_id").data('id')}
                    api('assets.deleteProject', $.cookie('token'), id, function(err, data){
                        if (err)
                            alert(err)
                        else
                            self.app.router.navigateTo('/web/')
                    })
                }
            },
            "click .edit-pageRule":function(e){
                var self = this;
                var $this = self.$(e.currentTarget);
                var $form = $this.closest('form');
                require(["views/settings/pageRule_edit_view"],function(PageRule){
                    var p = new PageRule({app:self.app});
                    var index = parseInt($this.data('index'));
                    p.data = {pageRule:self.data.project.pageRules[index]};
                    p.render(safe.sure(self.app.errHandler,function(text){
                        var $p = $(text);
                        p.bindDom($p);
                        $form.empty();
                        $form.append($p);
                    }))
                    p.once('saveRule',function(data){
                        api("assets.savePageRule", $.cookie("token"),data, function(err,data){
                            if (err)
                                alert(err);
                            else {
                                api.invalidate();
                                self.app.router.reload();
                            }
                        })

                    })
                },this.app.errHandler)
            },
            "click .edit": function(e){
                var self = this;
                var form = self.$('form[id="'+$(e.currentTarget).data("type")+'"]');
                form.find("span").toggle();
                form.find("input").toggle();
                form.find("select").toggle();
                form.find("div[type='submit']").toggle();
            },
            'click .send': function(e) {
                var self = this;
                var index;
                var send = self.$(e.currentTarget).data('send');
                var array = $("#"+send).serializeArray();
                var data = {filter : {}};

                data._id = self.$("#_id").data('id');

                if (send == 'apdexT') {
                    data.filter.apdexConfig = {};
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
            },
            'click .addPageRule': function(e) {
                var self = this;
                var data = {
                    pageRule: {
                        _s_condition: "No Condition"
                    }
                };
                data._id = self.$("#_id").data('id');
                api('assets.addPageRule', $.cookie('token'), data, function(err,data){
                    if (err)
                        alert(err);
                    else{
                        api.invalidate();
                        self.app.router.reload();
                    }
                })
            },
            'click .deletePageRule':function(e){
                if(confirm('Are you sure delete this Page Rule?')) {
                    var self = this;
                    var data = {
                        filter:{
                            _id:$(e.currentTarget).data('id')
                        },
                        _id:self.$("#_id").data('id')
                    };
                    api('assets.deletePageRule', $.cookie('token'), data, function(err,data){
                        if (err)
                            alert(err);
                        else {
                            api.invalidate();
                            self.app.router.reload();
                        }

                    })
                }
            }
        }
    })
    View.id = "views/settings/settings_view";
    return View;
})