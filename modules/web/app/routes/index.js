'use strict';
/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash', 'feed/mainres'], (require, api, safe, _, feed) => (req, res, cb) => {

	safe.auto({
		view: cb => require(['views/index/index'], (view) => safe.back(cb, null, view), cb),
		data: cb => api('stats.getIndex', res.locals.token, { req, res }, cb)
	}, safe.sure(cb, r => {
		res.renderX({
			view: r.view,
			data: {
				title: 'Tinelic - Home',
				teams: r.data.teams,
				_fv: r.data.fv
			}
		});
	}));

});
