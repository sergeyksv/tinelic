/* global define */
define([
	'tinybone/base',
	'lodash',
	'dustc!views/common/left_list_err.dust'
], (tb, _) => {
	let view = tb.View;
	let View = view.extend({
		id: 'views/common/left_list_err',
		events: {
			'submit #filterErr': function (e) {
				e.preventDefault();
				let $form = this.$(e.currentTarget),
					app = this.app, data = this.data;
				app.router.navigateTo(`${app.prefix}/project/${data.project.slug}/${data.type}/${data.st}?${$form.serialize()}`, app.clientError);
			},
			'reset #filterErr': function (e) {
				e.preventDefault();
				let app = this.app, data = this.data;
				app.router.navigateTo(`${app.prefix}/project/${data.project.slug}/${data.type}/${data.st}`, app.clientError);
			}
		},
		postRender: function () {}
	});
	View.id = 'views/common/left_list_err';
	return View;
});
