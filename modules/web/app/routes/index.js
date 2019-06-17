'use strict';
/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash', 'feed/mainres', 'moment'], (require, api, safe, _, feed, moment) => (req, res, cb) => {
	let quant = 5;
	safe.auto({
		view: (cb) => require(['views/index/index'], (view) => safe.back(cb, null, view), cb),
		data: (cb) => {
			let tolerance = 5 * 60 * 1000;
			let dtend = parseInt((Date.now() + tolerance) / tolerance) * tolerance;
			let dtstart = res.locals.dtend - 20 * 60 * 1000;
			api('web.getFeed', res.locals.token, {
				_t_age: quant + 'm', feed: 'mainres.homeInfo', params: {
					quant: quant, fv: req.query.fv, filter: {
						_dt: { $gt: dtstart, $lte: dtend }
					}
				}
			}, safe.sure(cb, (r) => {
				r.forEach((r) => {
					let period;
					let errAck = r.result.errAck;
					let Apdex = {}; let Server = {}; let Client = {}; let Ajax = {};
					Client.r = Client.e = Client.etu = 0;
					Apdex.client = Apdex.server = Apdex.ajax = 0;
					Ajax.r = Ajax.e = Ajax.etu = 0;
					Server.r = Server.e = Server.etu = Server.proc = Server.mem = 0;
					if (r.result.views.length) {
						period = r.result.views.length;
						_.each(r.result.views, (v) => {
							v = v.value;
							Client.r += v.r;
							Client.etu += v.tta;
							Client.e += v.e / v.r;
							Apdex.client += v.apdex;
						});

						Client.r = Client.r / period;
						Client.etu = Client.etu / period / 1000;
						Client.e = Client.e / period;
						Apdex.client = Apdex.client / period;
					}
					if (r.result.ajax.length) {
						period = r.result.ajax.length;
						_.forEach(r.result.ajax, (v) => {
							v = v.value;
							Ajax.r += v.r;
							Ajax.etu += v.tta;
							Ajax.e += v.e / v.r;
							Apdex.ajax += v.apdex;
						});

						Ajax.etu = Ajax.etu / period / 1000;
						Ajax.e = Ajax.e / period;
						Ajax.r = Ajax.r / period;
						Apdex.ajax = Apdex.ajax / period;
					}

					if (r.result.actions.length) {
						period = r.result.actions.length;
						_.forEach(r.result.actions, (v) => {
							v = v.value;
							Server.e += v.e / v.r;
							Server.r += v.r;
							Server.etu += v.tta;
							Apdex.server += v.apdex;
						});

						Server.etu = Server.etu / period / 1000;
						Server.r = Server.r / period;
						Server.e = Server.e / period;
						Apdex.server = Apdex.server / period;
					}
					if (r.result.metrics) {
						Server.proc = r.result.metrics.proc;
						Server.mem = r.result.metrics.mem;
					}
					_.assign(r, { apdex: Apdex, server: Server, client: Client, ajax: Ajax, errAck: errAck });
				});
				cb(null, r);
			}));
		},
		teams: (cb) => api('users.getCurrentUser', res.locals.token, {}, safe.sure(cb, (usr) => {
			if (!usr.favorites || !usr.favorites.length) {
				api('assets.getTeams', res.locals.token, { _t_age: quant + 'm' }, safe.sure(cb, (_teams) => {
					let _fv = 'ALL';
					cb(null, _teams, _fv);
				}));
			} else {
				if (req.query.fv == 'ALL') {
					api('assets.getTeams', res.locals.token, { _t_age: quant + 'm' }, safe.sure(cb, (_teams) => {
						let _fv = 'ALL';
						cb(null, _teams, _fv);
					}));
				}
				else {
					let idf = _.map(usr.favorites, '_idf');
					api('assets.getTeams', res.locals.token, { _t_age: quant + 'm', filter: { _id: { $in: idf } } }, safe.sure(cb, (_teams) => {
						let _fv = 'FAV';
						cb(null, _teams, _fv);
					}));

				}
			}
		})),
		metrics: ['data', 'teams', (cb, r) => {
			let _fv = r.teams[1];
			r.teams = r.teams[0];

			for (let team of r.teams) {

				let projects = {};
				for (const proj of r.data) {
					projects[proj._id] = proj;
				}
				for (const proj of team.projects) {
					proj._t_proj = projects[proj._idp];
				}

				let tmetrics = {};
				_.forEach(team.projects, (proj) => _.assignInWith(tmetrics, _.pick(proj._t_proj, 'apdex', 'server', 'client', 'errAck', 'ajax'), (oval, sval, key) => {
					let memo = {};
					let rpm = 1, k;
					if (key == 'apdex') for (k in sval) {
						if (_.isUndefined(proj._t_proj[k].r)) rpm = 1; else rpm = proj._t_proj[k].r;
						if (_.isUndefined(oval)) memo[k] = sval[k] * rpm; else memo[k] = oval[k] + sval[k] * rpm;
					} else
						for (k in sval) {
							if ((k == 'e') || (k == 'etu')) rpm = sval.r; else rpm = 1;
							if (_.isUndefined(oval)) memo[k] = sval[k] * rpm; else memo[k] = oval[k] + sval[k] * rpm;
						}
					return memo;
				}));

				_.forEach(tmetrics.apdex, (stat, key) => tmetrics.apdex[key] = stat / tmetrics[key].r);

				_.forEach(_.pick(tmetrics, 'server', 'client', 'ajax'), (stat, key) => {
					tmetrics[key].e = stat.e / tmetrics[key].r;
					tmetrics[key].etu = stat.etu / tmetrics[key].r;
				});

				if (tmetrics.server) {
					tmetrics.server.mem = tmetrics.server.mem / tmetrics.server.proc;
				}

				team.t_metrics = tmetrics;
			}

			cb(null, _fv);
		}]
	}, safe.sure(cb, (r) => {
		res.renderX({
			view: r.view,
			data: {
				title: 'Tinelic - Home',
				teams: r.teams,
				_fv: r.metrics
			}
		});
	}));
});
