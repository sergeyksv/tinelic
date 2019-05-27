/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash', 'moment'], (require, api, safe, _, moment) => (req, res, cb) => {
	if (req.path.substr(-1) != '/' && !req.params.id)
		return res.redirect(req.baseUrl + req.path + '/');
	let quant = res.locals.quant,
		dta,
		st = req.params.sort;
	let project, projIds, team;
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
			res.renderX({
				view: r.view, data: _.assign(r,
					{
						title: 'Server-errors', st: st, team: team, project: project, projIds: projIds,
						lastAck: lastAck, id: req.params.id
					})
			});
		}));
	}))
	], cb);
});
