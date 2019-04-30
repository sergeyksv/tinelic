/* global define */
define([
	'tinybone/base',
	'lodash',
	'dustc!views/database/database_left_list.dust',
	'dustc!views/common/left_list.dust',
	'bootstrap-table',
	'bootstrap-table-cookie'
], (tb, _) => {
	let view = tb.View;
	let View = view.extend({
		id: 'views/database/database_left_list',
		preRender: function () {
			this.locals.leftList = _.reduce(this.data.data, (r, d) => {
				let o = {_id: d._id};
				_.forEach(d.value, (v, k) => {o[k] = v;});
				r.push(o);
				return r;
			}, []);
		},
		postRender: function () {
			view.prototype.postRender.call(this);
			this.$el.find('#leftList').bootstrapTable({
				classes: 'table-sm',
				pagination: true,
				pageList: [],
				cookie: true,
				cookieIdTable: 'leftListDatabase',
				cookieStorage: 'sessionStorage',
				search: true
			});
		}
	});
	View.id = 'views/database/database_left_list';
	return View;
});
