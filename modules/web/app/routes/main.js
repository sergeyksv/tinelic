/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash', 'feed/mainres'], (require, api, safe, _, feed) => {
	return {
		index: (req, res, cb) => require(['routes/index'], (route) => route(req, res, cb), cb),
		project: (req, res, cb) => require(['routes/project'], (route) => route(req, res, cb), cb),
		users: (req, res, cb) => safe.parallel({
			view: (cb) => require(['views/users/users'], (view) => safe.back(cb, null, view), cb),
			users: (cb) => api('users.getUsers', res.locals.token, {}, cb)
		}, safe.sure(cb, (r) => {
			let rules = [{ action: 'user_new' }];
			_.forEach(r.users, (user) => rules.push({ action: 'user_edit', _id: user._id }));
			api('obac.getPermissions', res.locals.token, { rules: rules }, safe.sure(cb, (answers) => res.renderX({ view: r.view, data: { title: 'Manage users', users: r.users, obac: answers } })));
		})),
		teams: (req, res, cb) => safe.parallel({
			view: (cb) => require(['views/teams/teams'], (view) => safe.back(cb, null, view), cb),
			teams: (cb) => api('assets.getTeams', res.locals.token, {}, cb),
			proj: (cb) => api('assets.getProjects', res.locals.token, {}, cb),
			users: (cb) => api('users.getUsers', res.locals.token, {}, cb)
		}, safe.sure(cb, (r) => {
			let rules = [{ action: 'team_new' }, { action: 'project_new' }];
			_.forEach(r.teams, (team) => rules.push({ action: 'team_edit', _id: team._id }));
			safe.parallel({
				answers: (cb) => api('obac.getPermissions', res.locals.token, { rules: rules }, cb)
			}, safe.sure(cb, (result) => {
				_.forEach(r.teams, (teams) => {
					if (teams.projects) {
						let projects = {};
						_.forEach(r.proj, (proj) => projects[proj._id] = proj);
						_.forEach(teams.projects, (proj) => proj._t_project = projects[proj._idp]);
					}
					if (teams.users) {
						let users = {};
						_.forEach(r.users, (usr) => users[usr._id] = usr);
						_.forEach(teams.users, (user) => {
							user.firstname = users[user._idu].firstname;
							user.lastname = users[user._idu].lastname;
						});
					}
				});

				res.renderX({
					view: r.view, data: {
						title: 'Manage teams',
						teams: r.teams,
						proj: r.proj,
						usr: r.users,
						obac: result.answers
					}
				});
			}));
		})),
		prepare: (req, res, next) => {
			if (req.params.teams) {
				api('assets.getTeam', res.locals.token, { _t_age: '30d', filter: { name: req.params.teams } }, safe.sure(next, (_team) => {
					let tim = _.map(_team.projects, '_idp');
					res.locals.team = _team;
					api('assets.getProjects', res.locals.token, { _t_age: '30d', filter: { _id: { $in: tim } } }, safe.sure(next, (_project) => {
						res.locals.project = _project;
						res.locals.projIds = { $in: tim };
						next();
					}));
				}));
			} else {
				api('assets.getProject', res.locals.token, { _t_age: '30d', filter: { slug: req.params.slug } }, safe.sure(next, (_project) => {
					res.locals.project = _project;
					res.locals.projIds = res.locals.project._id;
					next();
				}));
			}
		},
		errors: (req, res, cb) => require(['routes/client-errors'], route => {
			route(req, res, cb);
		}, cb),
		server_errors: (req, res, cb) => require(['routes/server-errors'], route => {
			route(req, res, cb);
		}, cb),
		settings: (req, res, cb) => api('assets.getProject', res.locals.token, { _t_age: '30d', filter: { slug: req.params.slug } }, safe.sure(cb, (project) => safe.parallel({
			view: (cb) => require(['views/project-settings/settings'], (view) => safe.back(cb, null, view), cb),
			apdexConfig: (cb) => api('assets.getProjectApdexConfig', res.locals.token, { _id: project._id }, cb),
			obac: (cb) => api('obac.getPermissions', res.locals.token, { rules: [{ action: 'project_edit', _id: project._id }] }, cb)
		}, safe.sure(cb, (r) => res.renderX({ view: r.view, data: { title: 'Settings', project: project, apdexConfig: r.apdexConfig, obac: r.obac } }))
		))),
		metrics: (req, res, cb) => {
			let quant = res.locals.quant;
			safe.parallel({
				view: (cb) => require(['views/metrics/metrics'], (view) => safe.back(cb, null, view), cb),
				memory: (cb) => api('stats.getMetricTimings', res.locals.token, {
					quant: quant,
					filter: {
						_s_type: 'Memory/Physical',
						_idp: res.locals.projIds,
						_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend }
					}
				}, cb)
			}, safe.sure(cb, (r) => res.renderX({ view: r.view, data: { title: 'Metrics', project: res.locals.project, team: res.locals.team, mem: r.memory } })));
		},
		group_info: (req, res, cb) => require(['routes/group-info'], (route) => route(req, res, cb), cb)

	};
});
