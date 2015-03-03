define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!templates/err.dust'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/err",
        events: {
            'click .do-stats': function(e) {
                var self = this;
                $this = $(e.currentTarget);
                var h = window.location.pathname.split('/',5)
                this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
                return false;
            },
            'click .more': function(e) {
                var self = this;
                var id = $(e.currentTarget).data('id')
                var frame = self.$('#frame')
                frame.empty();
                frame.append('<iframe style="width:100%; height: 600px; border: 0px;" src='+location.origin+'/web/event/'+id+'/none></iframe>')
            }
        },
        postRender:function () {
            view.prototype.postRender.call(this);
            var ajax = this.data.rpm;
        }
    })
    View.id = "views/err_view";
    return View;
})
