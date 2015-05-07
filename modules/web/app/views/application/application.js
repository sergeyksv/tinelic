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
          },
          'click .more': function(e) {
			   var self = this;
              e.preventDefault();
              if ($(e.currentTarget).text() == "Next") {
				  this.locals.currentPage = parseInt(self.$('.findActive.active').text())+1;
			  } else if ($(e.currentTarget).text() == "Prev") {
				  this.locals.currentPage = parseInt(self.$('.findActive.active').text())-1;
			  } else {
				  this.locals.currentPage = parseInt($(e.currentTarget).html());
			  }
			  this.refresh(this.app.errHandler);
              return false;
          }
        },
        preRender: function () {
            var locals = this.locals;
            var data = this.data;
            var i;
            if (!locals.pageCount) {
                // set default data
                locals.pageCount = Math.ceil(data.data.length/10);
                var selIndex = 0;
                for (i=0; i<data.data.length; i++) {
                    if (data.data[i]._id == data.query) {
                        selIndex = i;
                        break;
                    }
                }
                locals.currentPage = 1+Math.floor(selIndex/10);
            }
            // update paging helper variables
            locals.leftlistBegin = (locals.currentPage-1)*10;
            locals.leftlistEnd = locals.leftlistBegin+10;

            locals.paging = [];
            for (i=1; i<=locals.pageCount; i++) {
                locals.paging.push({index:i,selected:i==locals.currentPage});
            }
        },
        postRender:function () {
            view.prototype.postRender.call(this);
			var self = this;
        }
    })
    View.id = "views/application/application";
    return View;
})
