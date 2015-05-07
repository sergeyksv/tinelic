define(['tinybone/base','lodash',"tinybone/backadapter",'safe','dustc!views/project-settings/settings.dust'],function (tb,_,api,safe) {
    var view = tb.View;
    var View = view.extend({
        id:"views/project-settings/settings",
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
            "click .doEditRule":function(e){
                var self = this;
                var $this = $(e.currentTarget);
                var id = $this.data('id');
                var $anchor = id?$this.closest('form'):$this.closest('legend');
                var $current = id?$this.closest('form'):$();
                require(["views/project-settings/pageRule_edit"],function(PageRule){
                    var p = new PageRule({app:self.app});
                    p.data = _.findWhere(self.data.project.pageRules, {_id:id}) || {};
                    p.locals = {idx:$anchor.data("index")};
                    p.render(safe.sure(self.app.errHandler,function(text){
                        var $p = $(text);
                        $anchor.after($p);
						$current.hide();
                        p.bindDom($p);
                    }))
                    p.on('cancel',function () {
						$current.show();
						p.remove();
					})
                    p.on('save',function(){
                        api("assets.savePageRule", $.cookie("token"),{_id:self.data.project._id, rule:p.data}, function(err){
                            if (err) {
								p.$("#error").text(err.toString()).show();
                            } else {
                                api.invalidate();
                                p.remove();
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
                form.find('p').toggle();
                form.find("input").toggle();
                form.find("select").toggle();
                form.find("div[type='submit']").toggle();
            },
            'click .saveApdex': function(e) {
                var self = this;
                var data = {filter : {}};
                var send = self.$(e.currentTarget).data('send');
                var array = $("#"+send).serializeArray();


                if (self.$('.saveApdex:visible').length > 1)
                    if(!confirm('are you sure save this property, other editing props to be lose?'))
                        return false

                _.forEach(array,function(obj) {
                    data.filter[obj.name] = obj.value
                })

                data._id = self.$("#_id").data('id');

                api('assets.saveApdexT', $.cookie('token'),data,function(err,data){
                    if (err)
                        alert(err)
                    else {
                        api.invalidate();
                        self.app.router.reload();
                    }
                })
            },
            'click .send': function(e) {
                var self = this;

                if (self.$('.send:visible').length > 1)
                    if(!confirm('are you sure save this property, other editing props to be lose?'))
                        return false

                var send = self.$(e.currentTarget).data('send');
                var array = $("#"+send).serializeArray();
                var data = {filter : {}};

                data._id = self.$("#_id").data('id');

                _.forEach(array,function(obj) {
                    data.filter[obj.name] = obj.value
                })

                api("assets.saveProjectsConfig", $.cookie("token"),data, function(err,data){
                    if (err)
                        alert(err)
                    else {
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
    View.id = "views/project-settings/settings";
    return View;
})
