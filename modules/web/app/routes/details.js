'use strict';
/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash'], (require, api, safe, _) => {

	const getVariables = (req, res) => {
		let page = parseInt(req.query.page);
		if (!page || page < 1) page = 1;
		// let skip = page * limit;
		return {
			st: req.params.stats,
			quant: res.locals.quant,
			projIds: res.locals.projIds,
			dtStart: res.locals.dtstart,
			dtEnd: res.locals.dtend,
			search: req.query.search,
			selected: req.query.selected,
			page: page,
			limit: parseInt(req.query.limit || 10)
		};
	};

	const parseData = ({data, st, dtStart, dtEnd, search}) => {
		// sorting "mtc", "sar" etc
		data = _.sortBy(data, (v) => {
			if (st == 'rpm')
				return -1 * v.value.c;
			if (st == 'mtc')
				return -1 * (v.value.tt);
			if (st == 'sar')
				return -1 * v.value.tt / v.value.c;
			if (st == 'wa')
				return 1 * v.value.apdex;
			if (st == 'req')
				return v.value.c * -1;
		});

		let sum = 0;
		_.forEach(data, (r) => {
			if (st == 'rpm')
				sum += r.value.c;
			if (st == 'mtc')
				sum += r.value.tt;
			if (st == 'sar')
				sum += r.value.tt / r.value.c;
			if (st == 'wa')
				sum += r.value.apdex;
			if (st == 'req')
				sum += r.value.c;
		});

		let percent = sum / 100;
		_.forEach(data, (r) => {
			if (st == 'rpm')
				r.value.bar = Math.round(r.value.c / percent);
			if (st == 'mtc')
				r.value.bar = Math.round((r.value.tt) / percent);
			if (st == 'sar')
				r.value.bar = Math.round(r.value.tt / r.value.c / percent);
			if (st == 'wa')
				r.value.bar = r.value.apdex * 100;
			if (st == 'req')
				r.value.bar = Math.round(r.value.c / percent);
			r.value.r = r.value.c / ((dtEnd - dtStart) / (1000 * 60));
			r.value.tta = r.value.tt / r.value.c / 1000;
		});

		data = _.reduce(data, (r, d) => {
			let o = {_id: d._id};
			_.forEach(d.value, (v, k) => {o[k] = v;});
			r.push(o);
			return r;
		}, []);

		if (search)
			data = _.filter(data, d => _.includes(d._id, search));

		return data;
	};

	return {
		application: (req, res, cb) => {

			let cat = req.query.cat || 'WebTransaction';

			let { st, quant, projIds, dtStart, dtEnd, search, selected, page, limit } = getVariables(req, res);

			safe.parallel({
				view: (cb) => require(['views/application/application'], (view) => safe.back(cb, null, view), cb),
				breakdown: (cb) => {
					if (!req.query.selected)
						return safe.back(cb, null, []);
					api('stats.getActionBreakdown', res.locals.token, {
						_t_age: quant + 'm', quant: quant, filter: {
							_idp: projIds,
							_dt: { $gt: dtStart, $lte: dtEnd },
							_s_name: req.query.selected
						}
					}, cb);
				},
				getActionMixTimings: (cb) => {
					if (!req.query.selected)
						return safe.back(cb, null, []);
					api('stats.getActionMixStats', res.locals.token, {
						_t_age: quant + 'm', quant: quant, facet: { timings: true }, filter: {
							_idp: projIds,
							_dt: { $gt: dtStart, $lte: dtEnd },
							_s_name: req.query.selected
						}
					}, cb);
				},
				getActionMixStats: (cb) => {
					let filter = {
						_idp: projIds,
						_dt: { $gt: dtStart, $lte: dtEnd },
						_s_cat: cat
					};
					api('stats.getActionMixStats', res.locals.token, {
						_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: filter
					}, cb);
				}
			}, safe.sure(cb, (r) => {
				r.data = r.getActionMixStats.stats;
				r.graphs = r.getActionMixTimings.timings || r.getActionMixStats.timings;
				let stat = {};
				stat.apdex = 0; stat.rpm = 0; stat.tta = 0;
				_.forEach(r.graphs, (r) => {
					r = r.value;
					stat.apdex += r.apdex;
					stat.rpm += r.r;
					stat.tta += r.tta;
				});
				let c = r.graphs.length;
				stat.apdex = stat.apdex / c;
				stat.tta = stat.tta / c / 1000;
				stat.rpm = stat.rpm / c;

				r.data = parseData({ data: r.data, st, dtStart, dtEnd, search });

				_.forEach(r.breakdown, (r) => {
					r.value.cnt = r.value.c;
					r.value.tta = r.value.tt / r.value.c;
					r.value.owna = r.value.ot / r.value.c;
				});

				res.renderX({
					view: r.view,
					data: {
						count: _.size(r.data),
						page: page,
						selected: selected,
						query: selected ? true : false,
						search: search,
						leftList: _.chunk(r.data, limit)[page - 1],
						breakdown: r.breakdown,
						graphs: r.graphs,
						title: 'Application',
						type: 'application',
						st: st,
						cat: cat,
						project: res.locals.project,
						team: res.locals.team,
						stat: stat
					}
				});
			}));
		},
		ajax: (req, res, cb) => {

			let { st, quant, projIds, dtStart, dtEnd, search, selected, page, limit } = getVariables(req, res);

			safe.parallel({
				view: (cb) => require(['views/ajax/ajax'], (view) => safe.back(cb, null, view), cb),
				getAjaxMixBreakdown: (cb) => {
					if (!selected)
						return safe.back(cb, null, []);
					api('stats.getAjaxMixStats', res.locals.token, {
						_t_age: quant + 'm', quant: quant, facet: { timings: true, breakdown: true }, filter: {
							_idp: projIds,
							_dt: { $gt: dtStart, $lte: dtEnd },
							_s_name: selected
						}
					}, cb);
				},
				getAjaxMixStats: (cb) => api('stats.getAjaxMixStats', res.locals.token, {
					_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: {
						_idp: projIds,
						_dt: { $gt: dtStart, $lte: dtEnd }
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

				r.rpm = parseData({data: r.rpm, st, dtStart, dtEnd, search});

				_.forEach(r.breakdown, (r) => r.value.tta = r.value.tt / r.value.c);

				res.renderX({
					view: r.view,
					data: {
						count: _.size(r.rpm),
						page: page,
						selected: selected,
						query: selected ? true : false,
						search: search,
						leftList: _.chunk(r.rpm, limit)[page - 1],
						breakdown: r.breakdown,
						graphs: r.graphs,
						project: res.locals.project,
						team: res.locals.team,
						st: st,
						title: 'Ajax',
						type: 'ajax',
						stat: stat
					}
				});
			}));
		},
		database: (req, res, cb) => {

			let cat = req.query.cat || 'Datastore';

			let { st, quant, projIds, dtStart, dtEnd, search, selected, page, limit } = getVariables(req, res);

			safe.parallel({
				view: (cb) => require(['views/database/database'], (view) => safe.back(cb, null, view), cb),
				getActionSegmentMix: (cb) => api('stats.getActionSegmentMix', res.locals.token, {
					_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: {
						_idp: projIds,
						_dt: { $gt: dtStart, $lte: dtEnd },
						'data._s_cat': cat
					}
				}, cb),
				getActionSegmentBreakdownMix: (cb) => {
					if (req.query.selected) {
						api('stats.getActionSegmentMix', res.locals.token, {
							_t_age: quant + 'm', facet: { timings: true, breakdown: true }, quant: quant, filter: {
								_idp: projIds,
								_dt: { $gt: dtStart, $lte: dtEnd },
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
						_dt: { $gt: dtStart, $lte: dtEnd }
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

				r.data = parseData({data: r.data, st, dtStart, dtEnd, search});

				_.forEach(r.breakdown, (r) => {
					r.value.cnt = r.value.c;
					r.value.tta = r.value.tt / r.value.c;
				});

				res.renderX({
					view: r.view,
					route: req.route.path,
					data: {
						count: _.size(r.data),
						page: page,
						selected: selected,
						query: selected ? true : false,
						search: search,
						leftList: _.chunk(r.data, limit)[page - 1],
						breakdown: r.breakdown,
						graphs: r.graphs,
						title: 'Database/Statements',
						type: 'database',
						st: st,
						team: res.locals.team,
						cat: cat,
						fr: filter,
						project: res.locals.project,
						stat: stat
					}
				});
			}));
		},
		pages: (req, res, cb) => {

			let { st, quant, projIds, dtStart, dtEnd, search, selected, page, limit } = getVariables(req, res);

			safe.parallel({
				view: (cb) => require(['views/pages/pages'], (view) => safe.back(cb, null, view), cb),
				breakdown: (cb) => {
					if (!req.query.selected)
						return safe.back(cb, null, []);
					api('stats.getPageBreakdown', res.locals.token, {
						_t_age: quant + 'm', quant: quant, filter: {
							_idp: projIds,
							_dt: { $gt: dtStart, $lte: dtEnd },
							_s_route: req.query.selected
						}
					}, cb);
				},
				getPageMixTimings: (cb) => {
					if (!req.query.selected)
						return safe.back(cb, null, []);
					api('stats.getPageMixStats', res.locals.token, {
						_t_age: quant + 'm', quant: quant, facet: { timings: true }, filter: {
							_idp: projIds,
							_dt: { $gt: dtStart, $lte: dtEnd },
							_s_route: req.query.selected
						}
					}, cb);
				},
				getPageMixStats: (cb) => api('stats.getPageMixStats', res.locals.token, {
					_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: {
						_idp: projIds,
						_dt: { $gt: dtStart, $lte: dtEnd }
					}
				}, cb)
			}, safe.sure(cb, (r) => {
				r.data = r.getPageMixStats.stats;
				r.graphs = r.getPageMixTimings.timings || r.getPageMixStats.timings;
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
				stat.tta = stat.tta / c / 1000;
				stat.r = stat.r / c;
				stat.epm = stat.e / c;
				stat.erate = stat.epm / stat.r;

				r.data = parseData({data: r.data, st, dtStart, dtEnd, search});

				_.forEach(r.breakdown, (r) => r.value.tta = r.value.tt / r.value.c);

				res.renderX({
					view: r.view,
					data: {
						count: _.size(r.data),
						page: page,
						selected: selected,
						query: selected ? true : false,
						search: search,
						leftList: _.chunk(r.data, limit)[page - 1],
						breakdown: r.breakdown,
						graphs: r.graphs,
						title: 'Pages',
						type: 'pages',
						st: st,
						project: res.locals.project,
						team: res.locals.team,
						stat: stat
					}
				});
			}));
		}
	};
});
