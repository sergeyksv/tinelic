/* global define */
define([
	'tinybone/base',
	'lodash',
	'tinybone/backadapter',
	'safe',
	'dustc!views/ajax/ajax_left_list.dust',
	'dustc!views/common/left_list.dust',
	'bootstrap-table',
	'bootstrap-table-cookie'
], function (tb, _, api, safe) {
	var view = tb.View;

	var View = view.extend({
		id: 'views/ajax/ajax_left_list',
		preRender: function () {
			this.locals.table = _.reduce(this.data.rpm, (r, d) => {
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
				cookie: true,
				cookieIdTable: 'leftListAjax',
				cookieStorage: 'sessionStorage',
				search: true
			});
			this.$el.find('#leftList').show();
		}
	});
	View.id = 'views/ajax/ajax_left_list';
	return View;
});
