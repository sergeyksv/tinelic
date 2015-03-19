define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!templates/server-errors/server-err.dust'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/server-errors/server-err",
        events: {
            'click .do-stats': function(e) {
                var self = this;
                $this = $(e.currentTarget);
                var h = window.location.pathname.split('/',5)
                this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+"/"+$this.data('sort')+'/');
                return false;
            }
        }
    })
    View.id = "views/server-errors/server-err_view";
    return View;
})
