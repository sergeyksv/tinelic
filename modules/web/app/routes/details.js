/* global define */
define(['require', 'tinybone/backadapter', 'safe', 'lodash'], (require, api, safe, _) => {
	return {
		application: (req, res, cb) => {
			let st = req.params.stats;
			let quant = res.locals.quant;
			let cat = req.query.cat || 'WebTransaction';
			let projIds = res.locals.projIds;

			safe.parallel({
				view: (cb) => require(['views/application/application'], (view) => safe.back(cb, null, view), cb),
				breakdown: (cb) => {
					if (!req.query.selected)
						return safe.back(cb, null, []);
					api('stats.getActionBreakdown', res.locals.token, {
						_t_age: quant + 'm', quant: quant, filter: {
							_idp: projIds,
							_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend },
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
							_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend },
							_s_name: req.query.selected
						}
					}, cb);
				},
				getActionMixStats: (cb) => {
					let filter = {
						_idp: projIds,
						_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend },
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

				// sorting "mtc", "sar" etc
				r.data = _.sortBy(r.data, (v) => {
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
				_.forEach(r.data, (r) => {
					if (st == 'rpm')
						sum += r.value.c;
					if (st == 'mtc')
						sum += r.value.tt;
					if (st == 'sar')
						sum += r.value.tt / r.value.c;
					if (st == 'wa') {
						sum += r.value.apdex;
					}
				});
				let percent = sum / 100;
				_.forEach(r.data, (r) => {
					if (st == 'rpm')
						r.value.bar = Math.round(r.value.c / percent);
					if (st == 'mtc')
						r.value.bar = Math.round((r.value.tt) / percent);
					if (st == 'sar')
						r.value.bar = Math.round(r.value.tt / r.value.c / percent);
					if (st == 'wa')
						r.value.bar = r.value.apdex * 100;
					r.value.r = r.value.c / ((res.locals.dtend - res.locals.dtstart) / (1000 * 60));
					r.value.tta = r.value.tt / r.value.c / 1000;
				});

				_.forEach(r.breakdown, (r) => {
					r.value.cnt = r.value.c;
					r.value.tta = r.value.tt / r.value.c;
					r.value.owna = r.value.ot / r.value.c;
				});

				r.data = _.reduce(r.data, (r, d) => {
					let o = {_id: d._id};
					_.forEach(d.value, (v, k) => {o[k] = v;});
					r.push(o);
					return r;
				}, []);

				res.renderX({
					view: r.view,
					data: {
						leftList: r.data,
						breakdown: r.breakdown,
						graphs: r.graphs,
						title: 'Application',
						st: st,
						cat: cat,
						query: req.query,
						project: res.locals.project,
						team: res.locals.team,
						stat: stat
					}
				});
			}));
		},
		ajax: (req, res, cb) => {
			let st = req.params.stats;
			let quant = res.locals.quant;
			let projIds = res.locals.projIds;

			safe.parallel({
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
						project: res.locals.project,
						team: res.locals.team,
						st: st,
						title: 'Ajax',
						stat: stat,
						query: req.query
					}
				});
			}));
		},
		database: (req, res, cb) => {
			let st = req.params.stats;
			let quant = res.locals.quant;
			let dtstart = res.locals.dtstart;
			let dtend = res.locals.dtend;
			let cat = req.query.cat || 'Datastore';
			let projIds = res.locals.projIds;

			safe.parallel({
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
						team: res.locals.team,
						cat: cat,
						fr: filter,
						query: req.query,
						project: res.locals.project,
						stat: stat
					}
				});
			}));
		},
		pages: (req, res, cb) => {
			let st = req.params.stats;
			let quant = res.locals.quant;
			let projIds = res.locals.projIds;

			safe.parallel({
				view: (cb) => require(['views/pages/pages'], (view) => safe.back(cb, null, view), cb),
				breakdown: (cb) => {
					if (!req.query.selected)
						return safe.back(cb, null, []);
					api('stats.getPageBreakdown', res.locals.token, {
						_t_age: quant + 'm', quant: quant, filter: {
							_idp: projIds,
							_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend },
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
							_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend },
							_s_route: req.query.selected
						}
					}, cb);
				},
				getPageMixStats: (cb) => api('stats.getPageMixStats', res.locals.token, {
					_t_age: quant + 'm', quant: quant, facet: { stats: true, timings: true }, filter: {
						_idp: projIds,
						_dt: { $gt: res.locals.dtstart, $lte: res.locals.dtend }
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

				// sorting "mtc", "sar" etc
				r.data = _.sortBy(r.data, (v) => {
					if (st == 'rpm')
						return -1 * v.value.c;
					if (st == 'mtc')
						return -1 * v.value.tt;
					if (st == 'sar')
						return -1 * v.value.tt / v.value.c;
					if (st == 'wa')
						return 1 * v.value.apdex;
				});
				let sum = 0;
				_.forEach(r.data, (r) => {
					if (st == 'rpm')
						sum += r.value.c;
					if (st == 'mtc')
						sum += r.value.tt;
					if (st == 'sar')
						sum += r.value.tt / r.value.c;
					if (st == 'wa') {
						sum += r.value.apdex;
					}
				});
				let percent = sum / 100;
				_.forEach(r.data, (r) => {
					if (st == 'rpm')
						r.value.bar = Math.round(r.value.c / percent);
					if (st == 'mtc')
						r.value.bar = Math.round((r.value.tt) / percent);
					if (st == 'sar')
						r.value.bar = Math.round(r.value.tt / r.value.c / percent);
					if (st == 'wa')
						r.value.bar = r.value.apdex * 100;
					r.value.r = r.value.c / ((res.locals.dtend - res.locals.dtstart) / (1000 * 60));
					r.value.tta = r.value.tt / r.value.c / 1000;
				});
				_.forEach(r.breakdown, (r) => r.value.tta = r.value.tt / r.value.c);

				r.data = _.reduce(r.data, (r, d) => {
					let o = {_id: d._id};
					_.forEach(d.value, (v, k) => {o[k] = v;});
					r.push(o);
					return r;
				}, []);

				res.renderX({
					view: r.view,
					data: {
						leftList: r.data,
						breakdown: r.breakdown,
						graphs: r.graphs,
						title: 'Pages',
						st: st,
						query: req.query,
						project: res.locals.project,
						team: res.locals.team,
						stat: stat
					}
				});
			}));
		}
	};
});
