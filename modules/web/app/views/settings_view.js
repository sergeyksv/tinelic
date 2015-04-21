define(['tinybone/base','lodash',"tinybone/backadapter",'dustc!templates/settings.dust'],function (tb,_,api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/settings",
        events: {
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
            "click .edit": function(e){
                var self = this
                var form = self.$('form[id="'+$(e.currentTarget).data("type")+'"]')
                form.find("span").toggle()
                form.find("input").toggle()
                form.find("select").toggle()
                form.find("div[type='submit']").toggle()
                form.find(".close").toggle()
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
                else if (send.search(/pageRule/) == 0) {
                    index = $(e.currentTarget).closest('form').attr('id').replace(/^pageRules/,"")
                    _.forEach(array,function(obj) {
                        data.filter['pageRules.'+ index + '.' + obj.name] = obj.value;
                    });
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
            'click .deletePageRuleAction': function(e) {
                var self = this;
                var id = self.$(e.currentTarget).data('send');
                var data = {filter:{_id: id}};
                var index = $(e.currentTarget).closest('form').attr('id').replace(/^pageRules/,"")
                data._id = self.$("#_id").data('id');
                data._i_index = index;
                api('assets.deletePageRuleAction', $.cookie('token'), data, function(err,data){
                    if (err)
                        alert(err);
                    else{
                        api.invalidate();
                        self.app.router.reload();
                    }
                })
            },
            'click .addAction': function(e) {
                var self = this;
                var index = self.$(e.currentTarget).data('send').replace(/(^pageRule)/,"");
                var data = {filter: {
                    _s_type: "NoReplace",
                    _s_field: "NoName",
                    _s_matcher: "NoMatcher",
                    _s_replacer: "NoReplacer"
                }};
                data._id = self.$("#_id").data('id');
                data._i_index = index;
                api('assets.addPageRuleAction', $.cookie('token'), data, function(err,data){
                    if (err)
                        alert(err);
                    else{
                        api.invalidate();
                        self.app.router.reload();
                    }
                })
            },
            'click .addPageRule': function(e) {
                var self = this;
                var data = {
                    filter: {
                        _s_condition: "No Condition",
                        actions: [
                            {
                                _s_type: "NoReplace",
                                _s_field: "NoName",
                                _s_matcher: "NoMatcher",
                                _s_replacer: "NoReplacer"
                            }
                        ]
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
    })
    View.id = "views/settings_view";
    return View;
})