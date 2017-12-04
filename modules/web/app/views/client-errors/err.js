define(['tinybone/base', 'lodash',"tinybone/backadapter","safe", 'dustc!views/client-errors/err.dust'],function (tb,_,api, safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/client-errors/err",
		events: {
			'click .do-stats': function(e) {
				var self = this;
				$this = $(e.currentTarget);
				var h = window.location.pathname.split('/',5);
				this.app.router.navigateTo('/'+h[1]+'/'+h[2]+'/'+h[3]+"/"+h[4]+"/"+$this.data('sort')+'/');
				return false;
			},
			'click .do-ack': function(e) {
				var self = this;
				var router = self.app.router;
				var id = self.$("span[data-id]").data('id');
				id = id.split(',');
				safe.eachSeries(id, function(current_id, cb) {
					api('assets.ackProjectState', $.cookie('token'),{type:'_dtPagesErrAck',_id:current_id}, cb);
				}, function (err) {
					if (err){
						console.error(err);
					} else {
						api.invalidate();
						router.reload();
					}
				})
			}
		}
	});
	View.id = "views/client-errors/err";
	return View;
});
