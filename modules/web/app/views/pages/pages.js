define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!views/pages/pages.dust'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"views/pages/pages",
        events: {
            'click .do-stats': function(e) {
                var self = this;
                $this = $(e.currentTarget);
                var h = window.location.pathname.split('/',5);
                this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
                return false;
            }
        },
        postRender:function () {
            view.prototype.postRender.call(this);
            var self = this;
        }
    });
    View.id = "views/pages/pages";
    return View;
});
