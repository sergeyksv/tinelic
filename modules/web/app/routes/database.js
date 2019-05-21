/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash'], (require, api, safe, _) => (req, res, cb) => {
	let st = req.params.stats;
	let quant = res.locals.quant;
	let dtstart = res.locals.dtstart;
	let dtend = res.locals.dtend;
	let cat = req.query.cat || 'Datastore';
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
			view: (cb) => require(['views/database/database'], (view) => safe.back(cb, null, view), cb),
			getActionSegmentMix: (cb) => api('stats.getActionSegmentMix', res.locals.token, {
				_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: {
					_idp: projIds,
					_dt: { $gt: dtstart, $lte: dtend },
					'data._s_cat': cat
				}
			}, cb),
			getActionSegmentBreakdownMix: (cb) => {
				if (req.query.selected) {
					api('stats.getActionSegmentMix', res.locals.token, {
						_t_age: quant + 'm', facet: { timings: true, breakdown: true }, quant: quant, filter: {
							_idp: projIds,
							_dt: { $gt: dtstart, $lte: dtend },
							'data._s_cat': cat,
							'data._s_name': req.query.selected
						}
					}, cb);
				} else {
					cb(null, []);
				}
			}
		}, safe.sure(cb, (r) => {
			let filter = {
				_t_age: quant + 'm', quant: quant,
				filter: {
					_idp: projIds,
					_dt: { $gt: dtstart, $lte: dtend }
				}
			};
			r.data = r.getActionSegmentMix.stats;
			r.graphs = r.getActionSegmentBreakdownMix.timings || r.getActionSegmentMix.timings;
			r.breakdown = r.getActionSegmentBreakdownMix.breakdown;
			let stat = {};
			stat.tta = 0; stat.r = 0;
			_.forEach(r.graphs, (r) => {
				r = r.value;
				stat.r += r.r;
				stat.tta += r.tta;
			});
			let c = r.graphs.length;
			stat.tta = stat.tta / c / 1000;
			stat.r = stat.r / c;

			// sorting "req" , "mtc" etc
			let sum = 0;
			_.forEach(r.data, (r) => {
				if (st == 'req')
					sum += r.value.c;
				if (st == 'mtc')
					sum += r.value.tt;
				if (st == 'sar')
					sum += r.value.tt / r.value.c;
			});
			let procent = sum / 100;
			_.forEach(r.data, (r) => {
				if (st == 'req')
					r.value.bar = r.value.c / procent;
				if (st == 'mtc')
					r.value.bar = r.value.tt / procent;
				if (st == 'sar')
					r.value.bar = r.value.tt / r.value.c / procent;
				r.value.r = r.value.c / ((res.locals.dtend - res.locals.dtstart) / (1000 * 60));
				r.value.tta = r.value.tt / r.value.c / 1000;
			});
			r.data = _.sortBy(r.data, (r) => {
				if (st == 'req')
					r.value.c * -1;
				if (st == 'mtc')
					return (r.value.tt) * -1;
				if (st == 'sar')
					return r.value.tt / r.value.c * -1;
			});
			_.forEach(r.breakdown, (r) => {
				r.value.cnt = r.value.c;
				r.value.tta = r.value.tt / r.value.c;
			});

			r.data = _.reduce(r.data, (r, d) => {
				let o = {_id: d._id};
				_.forEach(d.value, (v, k) => {o[k] = v;});
				r.push(o);
				return r;
			}, []);

			res.renderX({
				view: r.view,
				route: req.route.path,
				data: {
					leftList: r.data,
					breakdown: r.breakdown,
					graphs: r.graphs,
					title: 'Database/Statements',
					st: st,
					team: team,
					cat: cat,
					fr: filter,
					query: req.query,
					project: project,
					stat: stat
				}
			});
		})
		)
	], cb);
});
