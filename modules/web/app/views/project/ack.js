define(['safe','tinybone/base', 'lodash',  "tinybone/backadapter",  'dustc!views/project/ack.dust'], function (safe, tb, _,  api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/ack",
		events: {
			'click #acknowledge': function(e) {
				var self = this;
				var router = self.app.router;
				var id = self.$("span[data-id]").data('id');
				id = id.split(',');
				safe.eachSeries(id, function(current_id, cb) {
					api('assets.ackProjectState', $.cookie('token'),{type: ['_dtPagesErrAck', '_dtActionsErrAck'],_id:current_id}, cb);
				}, function (err) {
					if (err){
						console.error(err);
					} else {
						api.invalidate();
						router.reload();
					}
				})
			},
		},
		postRender: function () {
			var self = this;
			if (!_.get(self, 'data.flags.obac')) {
				_.set(self, 'data.flags.obac', true);
				getApiData.call(this);
			}
		}
	});
	function getApiData() {
		var self = this;
		var params = _.get(self, 'data.params');
		var data_obac;
		data_obac=(params.filter._idp.$in)?params.filter._idp.$in:params.filter._idp;
		api("obac.getPermissions", $.cookie('token'), {rules:[{action:"project_edit",_id:data_obac}]}, function(err, data) {
			if (err) {
				console.error(err);
			} else {
				self.data.obac = data;
				self.refresh(self.app.errHandler);
			}
		});
	}
	View.id = "views/project/ack";
	return View;
});
