define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!views/database/database.dust', 'views/database/database_graph_table'],function (tb,_,api, safe) {
    var view = tb.View;
    var View = view.extend({
        id:"views/database/database",
        events: {
            'click .do-stats': function(e) {
                var self = this;
                $this = $(e.currentTarget);
                var h = window.location.pathname.split('/',5)
                this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+'/'+$this.data('sort'));
                return false;
            },
			'click .do-cat': function (e) {
				var self = this;
				$this = $(e.currentTarget);
				$.cookie('s_cat', $this.data('cat'),{expires: 5,path: '/'});
				this.app.router.reload();
				return false;
			},
			'click .do-type': function (e) {
				var self = this;
				$this = $(e.currentTarget);
				$.cookie('s_type', $this.data('type'),{expires: 5,path: '/'});
				this.app.router.reload();
				return false;
			},
        },
        postRender:function () {
            view.prototype.postRender.call(this);
            var self = this;
        }
    })
    View.id = "views/database/database";
    return View;
})
