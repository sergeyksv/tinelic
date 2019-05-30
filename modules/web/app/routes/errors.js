'use strict';
/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash', 'moment'], (require, api, safe, _, moment) => {

	const parseData = ({data, limit, page, search}) => {
		if (search) data = _.filter(data, d => _.includes(d.error._s_message, search));
		return _.chunk(data, limit)[page];
	};

	return {

		client_errors: (req, res, cb) => {
			// if (req.path.substr(-1) != '/' && !req.params.id)
			// 	return res.redirect(req.baseUrl + req.path + '/');
			let st = req.params.sort,
				quant = res.locals.quant,
				dtp;
			let project, projIds, team;
			let search = req.query.search;
			let page = req.query.page || 0;
			let limit = parseInt(req.query.limit || 10);
			safe.series([(cb) => {
				if (req.params.teams) {
					api('assets.getTeam', res.locals.token, { _t_age: '30d', filter: { name: req.params.teams } }, safe.sure(cb, (_team) => {
						let tim = _.map(_team.projects, '_idp');
						team = _team;
						api('assets.getProjects', res.locals.token, { _t_age: '30d', filter: { _id: { $in: tim } } }, safe.sure(cb, (_project) => {
							project = _project;
							projIds = { $in: tim };
							dtp = (project._dtPagesErrAck || res.locals.dtstart).valueOf();
							res.locals.dtstart = (dtp < res.locals.dtstart) ? dtp : res.locals.dtstart;
							res.locals.dtcliack = dtp;
							cb(null);
						}));
					}));
				} else {
					api('assets.getProject', res.locals.token, { _t_age: '30d', filter: { slug: req.params.slug } }, safe.sure(cb, (_project) => {
						project = _project;
						projIds = project._id;
						dtp = (project._dtPagesErrAck || res.locals.dtstart).valueOf();
						res.locals.dtstart = (dtp < res.locals.dtstart) ? dtp : res.locals.dtstart;
						res.locals.dtcliack = dtp;
						cb(null);
					}));
				}
			},
			(cb) => safe.run((cb) => {
				if (req.params.id)
					api('stats.getPageError', res.locals.token, { _t_age: '30d', filter: { _id: req.params.id } }, cb);
				else
					cb();
			}, safe.sure(cb, (error) => {
				let plan = error ? {
					prev: (cb) => api('stats.getPageError', res.locals.token, { _t_age: '10d', filter: { _id: { $lt: error._id }, _idp: projIds, ehash: error.ehash }, sort: { _id: -1 } }, cb),
					next: (cb) => api('stats.getPageError', res.locals.token, { _t_age: '10m', filter: { _id: { $gt: error._id }, _idp: projIds, ehash: error.ehash }, sort: { _id: 1 } }, cb)
				} : {};

				let params1 = {
					_t_age: '10m', filter: {
						_idp: projIds,
						_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend }
					}
				};
				let params2 = error ? _.merge({ filter: { ehash: error.ehash } }, params1) : params1;

				plan = _.assign(plan, {
					view: (cb) => require(['views/client-errors/err'], (view) => safe.back(cb, null, view), cb),
					data: (cb) => api('stats.getPageErrorStats', res.locals.token, params1, cb),
					info: (cb) => api('stats.getPageErrorInfo', res.locals.token, params2, cb),
					rpm: (cb) => api('stats.getPageErrorTimings', res.locals.token, _.assign({ quant: quant }, params2), cb),
					obac: (cb) => api('obac.getPermissions', res.locals.token, { _t_age: '10m', rules: [{ action: 'project_edit', _id: projIds }] }, cb)
				});
				safe.parallel(plan, safe.sure(cb, (r) => {
					r.event = { event: error ? error : false, info: r.info };
					let lastAck = moment(dtp).fromNow();
					let f = null;
					if (st == 'terr' || st === undefined || st == 'mr')
						f = 'count';
					else if (st == 'perr')
						f = 'pages';
					else if (st == 'serr')
						f = 'session';

					let sum = 0.0;
					_.forEach(r.data, (r) => sum += r.stats[f]);
					let percent = sum / 100;
					_.forEach(r.data, (r) => r.bar = r.stats[f] / percent);
					r.data = _.sortBy(r.data, (r) => {
						if (st == 'mr')
							r.error._dtf * -1;
						else
							r.stats[f] * -1;
					});

					const count = _.size(r.data);
					r.data = parseData({data: r.data, limit, page, search});

					res.renderX({
						view: r.view, data: _.assign(r, {
							count: count,
							page: page || 0,
							search: search,
							title: 'Errors',
							type: 'errors',
							st: st,
							project: project,
							team: team,
							lastAck: lastAck,
							projIds: projIds,
							id: req.params.id
						})
					});
				}));
			}))
			], cb);
		},

		server_errors: (req, res, cb) => {
			// if (req.path.substr(-1) != '/' && !req.params.id)
			// 	return res.redirect(req.baseUrl + req.path + '/');
			let quant = res.locals.quant,
				dta,
				st = req.params.sort;
			let project, projIds, team;
			let search = req.query.search;
			let page = req.query.page || 0;
			let limit = parseInt(req.query.limit || 10);
			safe.series([(cb) => {
				if (req.params.teams) {
					api('assets.getTeam', res.locals.token, { _t_age: '30d', filter: { name: req.params.teams } }, safe.sure(cb, (_team) => {
						let tim = _.map(_team.projects, '_idp');
						team = _team;
						api('assets.getProjects', res.locals.token, { _t_age: '30d', filter: { _id: { $in: tim } } }, safe.sure(cb, (_project) => {
							project = _project;
							projIds = { $in: tim };
							dta = (project._dtActionsErrAck || res.locals.dtstart).valueOf();
							res.locals.dtstart = (dta < res.locals.dtstart) ? dta : res.locals.dtstart;
							res.locals.dtseack = dta;
							cb(null);
						}));
					}));
				} else {
					api('assets.getProject', res.locals.token, { _t_age: '30d', filter: { slug: req.params.slug } }, safe.sure(cb, (_project) => {
						project = _project;
						projIds = project._id;
						dta = (project._dtActionsErrAck || res.locals.dtstart).valueOf();
						res.locals.dtstart = (dta < res.locals.dtstart) ? dta : res.locals.dtstart;
						res.locals.dtseack = dta;
						cb(null);
					}));
				}
			},
			(cb) => safe.run((cb) => {
				if (req.params.id)
					api('stats.getActionError', res.locals.token, { _t_age: '30d', filter: { _id: req.params.id } }, cb);
				else
					cb();
			}, safe.sure(cb, (error) => {
				let plan = error ? {
					prev: (cb) => api('stats.getActionError', res.locals.token, { _t_age: '10d', filter: { _id: { $lt: error._id }, _idp: projIds, ehash: error.ehash }, sort: { _id: -1 } }, cb),
					next: (cb) => api('stats.getActionError', res.locals.token, { _t_age: '10m', filter: { _id: { $gt: error._id }, _idp: projIds, ehash: error.ehash }, sort: { _id: 1 } }, cb)
				} : {};

				let params1 = {
					_t_age: '10m', filter: {
						_idp: projIds,
						_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend }
					}
				};
				let params2 = error ? _.merge({ filter: { ehash: error.ehash } }, params1) : params1;

				plan = _.assign(plan, {
					view: (cb) => require(['views/server-errors/server-err'], (view) => safe.back(cb, null, view), cb),
					data: (cb) => api('stats.getActionErrorStats', res.locals.token, params1, cb),
					info: (cb) => api('stats.getActionErrorInfo', res.locals.token, params2, cb),
					rpm: (cb) => api('stats.getActionErrorTimings', res.locals.token, _.assign({ quant: quant }, params2), cb),
					obac: (cb) => api('obac.getPermissions', res.locals.token, { _t_age: '10m', rules: [{ action: 'project_edit', _id: projIds }] }, cb)
				});
				safe.parallel(plan, safe.sure(cb, (r) => {
					r.event = { event: error ? error : false, info: r.info };
					let lastAck = moment(dta).fromNow();

					let sum = 0.0;
					_.forEach(r.data, (r) => sum += r.stats.c);
					let percent = sum / 100;
					_.forEach(r.data, (r) => r.bar = r.stats.c / percent);
					r.data = _.sortBy(r.data, (r) => {
						if (st == 'mr')
							r.error._dtf * -1;
						else
							r.stats.c * -1;
					});

					const count = _.size(r.data);
					r.data = parseData({data: r.data, limit, page, search});

					res.renderX({
						view: r.view, data: _.assign(r,
							{
								count: count,
								page: page || 0,
								search: search,
								title: 'Server-errors',
								type: 'server_errors',
								st: st,
								team: team,
								project: project,
								projIds: projIds,
								lastAck: lastAck,
								id: req.params.id
							})
					});
				}));
			}))
			], cb);
		}

	};
});
