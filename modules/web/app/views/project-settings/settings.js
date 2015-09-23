define(['require','tinybone/base','lodash',"tinybone/backadapter",'safe','dustc!views/project-settings/settings.dust'],function (require,tb,_,api,safe) {
    var view = tb.View;
    var View = view.extend({
        id:"views/project-settings/settings",
        events: {
            "click #doDeleteProject": function(e) {
                var self = this;
                self.app.confirm('Do you realy delete this project and all of this data?',safe.sure(self.app.errHandler,function(){
                    var id = {_id:self.data.project._id};
                    api('assets.deleteProject', $.cookie('token'), id, function(err, data){
                        if (err)
                            self.app.errHandler(err);
                        else
                            self.app.router.navigateTo('/web/')
                    })
                }))

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
            "click .doEditProjectName":function(e) {
                var self = this;
                var $curr = $(e.currentTarget);
                var $form = $curr.closest('form');
                require(['views/project-settings/stroke_edit'],function(StrokeEdit){
                    var p = new StrokeEdit({app:self.app});
                    p.data = {
                        name: self.data.project.name,
                        _t_title : $curr.data('title'),
                        _t_type : $curr.data('type'),
                        _t_val : $curr.data('val')
                    };

                    p.render(safe.sure(self.app.errHandler,function(text){
                        var $p = $(text);
                        $form.after($p);
                        $form.hide();
                        p.bindDom($p);
                    }));
                    p.on('cancel',function () {
                        $form.show();
                        p.remove();
                    });
                    p.on('save',function(data) {
                        safe.run(function (cb){
                            if (self.$('.doSaveStroke:visible').length > 1)
                                self.app.confirm('Are you sure save this property, other editing props to be lose?',cb);
                            else cb();
                        }, function() {
                            data.filter._id = self.data.project._id;

                            api('assets.saveProject', $.cookie('token'),{project:data.filter},function(err,data){
                                if (err)
                                    alert(err);
                                else {
                                    api.invalidate();
                                    self.app.router.navigateTo('/web/project/'+data.slug+'/settings');
                                }
                            });
                        });
                    });
                },this.app.errHandler);
            },
            "click .doEditApdex": function(e) {
                var self = this;
                var $curr = $(e.currentTarget);
                var $form = $curr.closest('form');
                require(['views/project-settings/stroke_edit'],function(StrokeEdit){
                    var a = new StrokeEdit({app:self.app});
                    a.data = self.data.apdexConfig;
                    a.data._t_title = $curr.data('title');
                    a.data._t_type = $curr.data('type');
                    a.data._t_val = $curr.data('val');
                    a.render(safe.sure(self.app.errHandler,function(text){
                        var $p = $(text);
                        $form.after($p);
                        $form.hide();
                        a.bindDom($p);
                    }));
                    a.on('cancel',function () {
                        $form.show();
                        a.remove();
                    });
                    a.on('save',function(data){
                        safe.run(function (cb){
                            if (self.$('.doSaveStroke:visible').length > 1)
                                self.app.confirm('Are you sure save this property, other editing props to be lose?',cb);
                            else cb();
                        }, function() {
                            api('assets.saveApdexT', $.cookie('token'),{_id:self.data.project._id,apdexConfig:data.filter},function(err,data){
                                if (err)
                                    alert(err);
                                else {
                                    api.invalidate();
                                    self.app.router.reload();
                                }
                            });
                        });
                    });
                },this.app.errHandler);
            },
            'click .deletePageRule':function(e){
                var self = this;
                self.app.confirm('Are you sure delete this Page Rule?',function(){
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
                });
            }
        }
    })
    View.id = "views/project-settings/settings";
    return View;
})
