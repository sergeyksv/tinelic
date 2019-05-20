/* global define */
define([
	'tinybone/base',
	'lodash',
	'dustc!views/server-errors/server-err_left_list.dust',
	'dustc!views/common/left_list_err.dust',
	'bootstrap-table'
], (tb, _) => {
	let view = tb.View;
	let View = view.extend({
		id: 'views/server-errors/server-err_left_list',
		postRender: function () {
			view.prototype.postRender.call(this);
			this.$el.find('#leftList').bootstrapTable({
				classes: 'table-sm',
				pagination: true,
				pageList: [],
				search: true
			});
		}
	});
	View.id = 'views/server-errors/server-err_left_list';
	return View;
});
