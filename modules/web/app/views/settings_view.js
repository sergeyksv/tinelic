define(['tinybone/base','lodash',"tinybone/backadapter",'dustc!templates/settings.dust'],function (tb,_,api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/settings",
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
            'click .savePageRule':function(e){
                var self = this;
                var id = self.$(e.currentTarget).data('id');
                var send = self.$(e.currentTarget).data('send');
                var array = $("#"+send).serializeArray();
                var data = {filter : {}};

                _.forEach(array,function(obj) {
                    data.filter['pageRules.$.'+obj.name] = obj.value;
                });
                data._id = id;

                api("assets.savePageRule", $.cookie('token'), data,function(err,data){
                    if (err)
                        alert(err);
                    else {
                        api.invalidate();
                        self.app.router.reload();
                    }


                })
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
            'click .deletePageRuleAction': function(e) {
                var $this = $(e.currentTarget);
                var form = $this.closest('form');
                var iA = form.find('.innerActions');
                iA.data('indexes', parseInt(iA.data('indexes')-1));
                $this.closest('.container-fluid').remove();
            },
            'click .addAction': function(e) {
                var self = this;
                var $this = self.$(e.currentTarget).closest('form');
                var innerActions = $this.find('.innerActions');
                var index = parseInt(innerActions.data('indexes'));
                index = (isNaN(index))?0:index+1;
                innerActions.append('\
                <div class="container-fluid" style="padding: 5px;">\
                    <label class="col-sm-2 control-label">Action '+index+'</label>\
                    <div class="col-sm-8">\
                    <div class="container-fluid">\
                    <div class="row">\
                    <div class="form-group">\
                    <label class="col-sm-3 control-label">type:</label>\
                    <div class="col-sm-9">\
                    <input type="text" name="actions.'+index+'._s_type" class="form-control" value="replacer" readonly>\
                    </div>\
                    </div>\
                    </div>\
                    <div class="row">\
                    <div class="form-group">\
                    <label class="col-sm-3 control-label">field:</label>\
                    <div class="col-sm-9">\
                    <input type="text" name="actions.'+index+'._s_field" class="form-control" value="No Field">\
                    </div>\
                    </div>\
                    </div>\
                    <div class="row">\
                    <div class="form-group">\
                    <label class="col-sm-3 control-label">matcher:</label>\
                    <div class="col-sm-9">\
                    <input type="text" name="actions.'+index+'._s_matcher" class="form-control" value="No Matcher">\
                    </div>\
                    </div>\
                    </div>\
                    <div class="row">\
                    <div class="form-group">\
                    <label class="col-sm-3 control-label">replacer:</label>\
                    <div class="col-sm-9">\
                    <input type="text" name="actions.'+index+'._s_replacer" class="form-control" value="No Replacer">\
                    </div>\
                    </div>\
                    </div>\
                    </div>\
                    </div>\
                <div class="col-sm-2">\
                <div type="submit" class="close deletePageRuleAction"><div aria-hidden="true">&times;</div></div>\
                </div>\
                </div>\
                ')
                innerActions.data('indexes',index);
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
    View.id = "views/settings_view";
    return View;
})