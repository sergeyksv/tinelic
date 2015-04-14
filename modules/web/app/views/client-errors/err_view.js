define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!templates/client-errors/err.dust'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/client-errors/err",
        events: {
            'click .do-stats': function(e) {
                var self = this;
                $this = $(e.currentTarget);
                var h = window.location.pathname.split('/',5)
                this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+"/"+$this.data('sort')+'/');
                return false;
            },
            'click .acknowledge': function(e) {
                var self = this;
                var router = self.app.router;
                var id = self.$("span[data-id]").data('id')
                api('assets.pullErrAck', $.cookie('token'),{type:'_dtPagesErrAck',_id:id}, function(err, data) {
                    if (err)
                        alert(err)
                    else {
                        api.invalidate();
                        router.reload();
                    }
                })
            }
        }
    })
    View.id = "views/client-errors/err_view";
    return View;
})
