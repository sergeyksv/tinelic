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
		events: {
			'submit #filterform': function (e) {
				e.preventDefault();
				let $form = this.$(e.currentTarget),
					app = this.app, data = this.data;
				app.router.navigateTo(`${app.prefix}/project/${data.project.slug}/${data.type}/${data.st}?${$form.serialize()}`, app.clientError);
			},
			'reset #filterform': function (e) {
				e.preventDefault();
				let app = this.app, data = this.data;
				app.router.navigateTo(`${app.prefix}/project/${data.project.slug}/${data.type}/${data.st}`, app.clientError);
			}
		},
		postRender: function () {}
	});
	View.id = 'views/common/left_list';
	return View;
});
