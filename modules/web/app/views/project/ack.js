define(['tinybone/base', 'lodash', "tinybone/backadapter", 'dustc!views/project/ack.dust'], function (tb, _, api) {
	var view = tb.View;
	var View = view.extend({
		id:"views/project/ack",
		events: {
			'click #acknowledge': function(e) {
				var self = this;
				var router = self.app.router;
				var id = self.$("span[data-id]").data('id');
				api('assets.ackProjectState', $.cookie('token'), {
					type: ['_dtPagesErrAck', '_dtActionsErrAck'],
					_id: id
				}, function(err, data) {
					if (err) {
						console.error(err);

					} else {
						api.invalidate();
						router.reload();
					}
				});
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
		api("obac.getPermissions", $.cookie('token'), {rules:[{action:"project_edit",_id:params.filter._idp}]}, function(err, data) {
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
