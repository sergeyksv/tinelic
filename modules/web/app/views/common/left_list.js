/* global define */
define([
	'tinybone/base',
	'lodash',
	'dustc!views/common/left_list.dust',
	'bootstrap-table'
], (tb, _) => {
	let view = tb.View;
	let View = view.extend({
		id: 'views/common/left_list',
		postRender: function () {
			view.prototype.postRender.call(this);
			this.$el.find('#leftList').bootstrapTable({
				classes: 'table-sm',
				pagination: true,
				// pageNumber: this.data.query.page,
				// onPageChange: (n) => this.data.query.page = n,
				pageList: [],
				search: true
			});
		}
	});
	View.id = 'views/common/left_list';
	return View;
});
