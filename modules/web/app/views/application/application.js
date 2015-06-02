define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!views/application/application.dust', 'views/application/application_graph_table'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"views/application/application",
        events: {
          'click .do-stats': function(e) {
              var self = this;
              $this = $(e.currentTarget);
              var h = window.location.pathname.split('/',5)
              this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
              return false;
          }
        },
        preRender: function () {
            var locals = this.locals;
            var data = this.data;
        },
        postRender:function () {
            view.prototype.postRender.call(this);
			var self = this;
        }
    })
    View.id = "views/application/application";
    return View;
})
