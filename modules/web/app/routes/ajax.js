/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash'], (require, api, safe, _) => (req, res, cb) => {
	let st = req.params.stats;
	let quant = res.locals.quant;
	let project, projIds, team;
	safe.series([
		(cb) => {
			if (req.params.teams) {
				api('assets.getTeam', res.locals.token, { _t_age: '30d', filter: { name: req.params.teams } }, safe.sure(cb, (_team) => {
					let tim = _.map(_team.projects, '_idp');
					team = _team;
					api('assets.getProjects', res.locals.token, { _t_age: '30d', filter: { _id: { $in: tim } } }, safe.sure(cb, (_project) => {
						project = _project;
						projIds = { $in: tim };
						cb(null);
					}));
				}));
			} else {
				api('assets.getProject', res.locals.token, { _t_age: '30d', filter: { slug: req.params.slug } }, safe.sure(cb, (_project) => {
					project = _project;
					projIds = project._id;
					cb(null);
				}));
			}
		},
		(cb) => safe.parallel({
			view: (cb) => require(['views/ajax/ajax'], (view) => safe.back(cb, null, view), cb),
			getAjaxMixBreakdown: (cb) => {
				if (!req.query.selected)
					return safe.back(cb, null, []);
				api('stats.getAjaxMixStats', res.locals.token, {
					_t_age: quant + 'm', quant: quant, facet: { timings: true, breakdown: true }, filter: {
						_idp: projIds,
						_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend },
						_s_name: req.query.selected
					}
				}, cb);
			},
			getAjaxMixStats: (cb) => api('stats.getAjaxMixStats', res.locals.token, {
				_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: {
					_idp: projIds,
					_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend }
				}
			}, cb)
		}, safe.sure(cb, (r) => {
			r.rpm = r.getAjaxMixStats.stats;
			r.graphs = r.getAjaxMixBreakdown.timings || r.getAjaxMixStats.timings;
			r.breakdown = r.getAjaxMixBreakdown.breakdown;
			let stat = {};
			stat.apdex = 0; stat.r = 0; stat.tta = 0; stat.e = 0;
			_.forEach(r.graphs, (r) => {
				r = r.value;
				stat.apdex += r.apdex;
				stat.r += r.r;
				stat.tta += r.tta;
				stat.e += r.e;
			});
			let c = r.graphs.length;
			stat.apdex = stat.apdex / c;
			stat.r = stat.r / c;
			stat.tta = stat.tta / c / 1000;
			stat.epm = stat.e / c;
			stat.e = stat.epm / stat.r;

			// sorting "mtc", "sar" etc
			r.rpm = _.sortBy(r.rpm, (v) => {
				if (st == 'rpm')
					return -1 * v.value.c;
				if (st == 'mtc')
					return -1 * (v.value.tt);
				if (st == 'sar')
					return -1 * v.value.tt / v.value.c;
				if (st == 'wa')
					return 1 * v.value.apdex;
			});
			let sum = 0;
			_.forEach(r.rpm, (r) => {
				if (st == 'rpm')
					sum += r.value.c;
				if (st == 'mtc')
					sum += r.value.tt;
				if (st == 'sar')
					sum += r.value.tt / r.value.c;
				if (st == 'wa')
					sum += r.value.apdex;
			});
			let percent = sum / 100;
			_.forEach(r.rpm, (r) => {
				if (st == 'rpm')
					r.value.bar = Math.round(r.value.c / percent);
				if (st == 'mtc')
					r.value.bar = Math.round(r.value.tt / percent);
				if (st == 'sar')
					r.value.bar = Math.round(r.value.tt / r.value.c / percent);
				if (st == 'wa')
					r.value.bar = r.value.apdex * 100;
				r.value.r = r.value.c / ((res.locals.dtend - res.locals.dtstart) / (1000 * 60));
				r.value.tta = (r.value.tt / r.value.c / 1000);
			});
			_.forEach(r.breakdown, (r) => r.value.tta = r.value.tt / r.value.c);

			r.rpm = _.reduce(r.rpm, (r, d) => {
				let o = { _id: d._id };
				_.forEach(d.value, (v, k) => { o[k] = v; });
				r.push(o);
				return r;
			}, []);

			res.renderX({
				view: r.view,
				data: {
					leftList: r.rpm,
					breakdown: r.breakdown,
					graphs: r.graphs,
					project: project,
					team: team,
					st: st,
					title: 'Ajax',
					stat: stat,
					query: req.query
				}
			});
		})
		)
	], cb);
});
