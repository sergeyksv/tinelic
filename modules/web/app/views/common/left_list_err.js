/* global define */
define([
	'tinybone/base',
	'lodash',
	'dustc!views/common/left_list_err.dust'
], (tb, _) => {
	let view = tb.View;
	let View = view.extend({
		id: 'views/common/left_list_err',
		getUrl: function (e, reset) {
			let $form = this.$(e.currentTarget),
				app = this.app, data = this.data;

			let url = `${app.prefix}/project/${data.project.slug}/${data.type}/${data.st}`;

			if (data.team && data.team.name) url = `${app.prefix}/team/${data.team.name}/${data.type}/${data.st}`;

			if (reset) return url;

			url += `?${$form.serialize()}`;

			return url;
		},
		events: {
			'submit #filterErr': function (e) {
				e.preventDefault();
				let app = this.app;

				app.router.navigateTo(this.getUrl(e), app.clientError);
			},
			'reset #filterErr': function (e) {
				e.preventDefault();
				let app = this.app;

				app.router.navigateTo(this.getUrl(e, true), app.clientError);
			}
		},
		postRender: function () {}
	});
	View.id = 'views/common/left_list_err';
	return View;
});
