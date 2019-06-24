'use strict';
const _ = require('lodash'),
	safe = require('safe'),
	{ CustomError } = require('tinyback');

module.exports.deps = ['mongo', 'prefixify', 'validate'];

let collections = ['page_errors', 'pages', 'page_reqs', 'actions', 'action_stats', 'action_errors', 'metrics'];

/**
* REST API to request letious statistics information, all functions readonly
*
* @exports StatsApi
*/
class Api {
	constructor({ ctx, collections }) {
		this.ctx = ctx;
		this.collections = collections;
		this.queryfix = ctx.api.prefixify.queryfix;
		this.sortfix = ctx.api.prefixify.sort;
		this.quant = 5;
	}

	/**
	* TimeSlot ( ms / quant / 60000 )
	* @typedef TimeSlot
	* @type {Number}
	*/

	/**
	* @global
	* @typedef PageError
	* @type {Object}
	*/

	/**
	* @global
	* @typedef ActionError
	* @type {Object}
	*/

	/**
	* Get total/new error counts for specific date range
	*
	* @param {String} token Auth token
	* @param {String} _idp Project id
	* @param {Object} _dt Date filter
	* @param {Date} _dt.$lte End date of range
	* @param {Date} _dt._dtActionsErrorAck Start date for action errors
	* @param {Date} _dt._dtPagesErrorAck Start date for pages errors
	*
	* @return {{actions:string, dtlActions:string, pages:string, dtlPages:string}}
	*/
	getErrorTotals(t, p, cb) {
		this.checkAccess(t, p, safe.sure(cb, () => safe.parallel({
			actions: (cb) => {
				let q = {
					_idp: p._idp,
					_dt: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtActionsErrAck
					}
				};
				q = this.queryfix(q);
				this.collections.action_errors.aggregate([{ $match: q }, { $group: { _id: '$ehash' } }], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res.length)));
			},
			dtlActions: (cb) => {
				let q = {
					_idp: p._idp,
					_dtf: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtActionsErrAck
					}
				};
				q = this.queryfix(q);
				this.collections.action_errors.aggregate([{ $match: q }, { $group: { _id: '$ehash' } }], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res.length)));
			},
			pages: (cb) => {
				let q = {
					_idp: p._idp,
					_dt: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtPagesErrAck
					}
				};
				q = this.queryfix(q);
				this.collections.page_errors.aggregate([{ $match: q }, { $group: { _id: '$ehash' } }], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res.length)));
			},
			dtlPages: (cb) => {
				let q = {
					_idp: p._idp,
					_dtf: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtPagesErrAck
					}
				};
				q = this.queryfix(q);
				this.collections.page_errors.aggregate([{ $match: q }, { $group: { _id: '$ehash' } }], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res.length)));
			}
		}, cb)));
	}

	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{proc:number, mem:number}>}
	*/
	getMetricTotals(t, p, cb) {
		let query = this.queryfix(p.filter);
		this.checkAccess(t, query, safe.sure(cb, () => this.collections.metrics.aggregate([
			{ $match: query },
			{ $group: { _id: '$_s_pid', mem1: { $sum: '$_f_val' }, c1: { $sum: '$_i_cnt' } } }
		], { allowDiskUse: true }, safe.sure(cb, (res) => {
			let memtt = 0;
			_.forEach(res, (r) => memtt += r.mem1 / r.c1);
			cb(null, { proc: res.length, mem: Math.round(memtt) });
		})
		)));
	}

	getActionMixStats(t, p, cb) {
		let query = this.queryfix(p.filter);
		if (!query._idp.$in) {
			query._idp = { $in: [query._idp] };
		}
		let _arrApdex = [];
		let _arrProjectIds = [];

		safe.eachSeries(query._idp.$in, (current_query, cb) => this.ctx.api.assets.getProjectApdexConfig(t, {
			_id: current_query
		}, (err, apdex) => {
			if (!err) {
				_arrApdex.push({ AA: apdex._i_serverT, AC: apdex._i_serverT * 4 });
				_arrProjectIds.push(current_query);
			}
			cb();
		}), safe.sure(cb, () => {
			let Q = parseInt(p.quant) || 1;
			let _dt0 = new Date(0);
			let facet_obj = {};
			let store_facet = {
				stats: [
					{
						$group: {
							_id: '$_s_name',
							c: { $sum: 1 },
							tt: { $sum: '$_i_tt' },
							ag: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $lte: ['$_i_tt', '$ApdexT.AA'] }, then: 1, else: 0 } } } } },
							aa: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $and: [{ $gt: ['$_i_tt', '$ApdexT.AA'] }, { $lte: ['$_i_tt', '$Apdex.AC'] }] }, then: 1, else: 0 } } } } }
						}
					},
					{ $project: { value: { c: '$c', tt: '$tt', apdex: { $divide: [{ $add: ['$ag', { $divide: ['$aa', 2] }] }, '$c'] } } } },
					{ $sort: { _id: 1 } }
				],
				timings: [
					{
						$group: {
							_id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } },
							c: { $sum: 1 },
							r: { $sum: { $divide: [1, Q] } },
							e: { $sum: { $divide: [{ $cond: { if: '$_i_err', then: 1, else: 0 } }, Q] } },
							tt: { $sum: '$_i_tt' },
							ag: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $lte: ['$_i_tt', '$ApdexT.AA'] }, then: 1, else: 0 } } } } },
							aa: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $and: [{ $gt: ['$_i_tt', '$ApdexT.AA'] }, { $lte: ['$_i_tt', '$ApdexT.AC'] }] }, then: 1, else: 0 } } } } }
						}
					},
					{ $project: { value: { c: '$c', r: '$r', e: '$e', tt: '$tt', ag: '$ag', aa: '$aa', apdex: { $divide: [{ $add: ['$ag', { $divide: ['$aa', 2] }] }, '$c'] }, tta: { $divide: ['$tt', '$c'] } } } },
					{ $sort: { _id: 1 } }
				]
			};
			_.forEach(p.facet, (n, key) => facet_obj[key] = store_facet[key]);
			if (!p.facet) {
				facet_obj = store_facet;
			}
			this.collections.actions.aggregate([
				{ $match: query },
				{ $addFields: { 'ApdexT': { $arrayElemAt: [_arrApdex, { $indexOfArray: [_arrProjectIds, '$_idp'] }] } } },
				{ $facet: facet_obj }
			], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res[0])));
		}));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,tt:number}}>}
	*/
	getActionTimings(t, p, cb) {
		p.facet = { timings: true };
		this.getActionMixStats(t, p, safe.sure(cb, (res) => cb(null, res.timings)));
	}
	/**
	* Agregate actions stats grouped by name
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{string},value:{apdex:number,c:number,tt:number}}>}
	*	Data grouped by action name
	*/
	getActionStats(t, p, cb) {
		p.facet = { stats: true };
		this.getActionMixStats(t, p, safe.sure(cb, (res) => cb(null, res.stats)));
	}

	getAjaxMixStats(t, p, cb) {
		let query = this.queryfix(p.filter);
		query = (p._idurl) ? _.assign(query, {
			_s_name: p._idurl
		}) : query;
		if (!query._idp.$in) {
			query._idp = { $in: [query._idp] };
		}
		let _arrApdex = [];
		let _arrProjectIds = [];
		safe.eachSeries(query._idp.$in, (current_query, cb) => this.ctx.api.assets.getProjectApdexConfig(t, {
			_id: current_query
		}, (err, apdex) => {
			if (!err) {
				_arrApdex.push({ AA: apdex._i_ajaxT, AC: apdex._i_ajaxT * 4 });
				_arrProjectIds.push(current_query);
			}
			cb();
		}), safe.sure(cb, () => {
			let Q = parseInt(p.quant) || 1;
			let _dt0 = new Date(0);
			let facet_obj = {};
			let store_facet = {
				stats: [
					{
						$group: {
							_id: '$_s_name',
							c: { $sum: 1 },
							tt: { $sum: '$_i_tt' },
							e: { $sum: { $multiply: [1.0, { $cond: { if: { $ne: ['$_i_code', 200] }, then: 1, else: 0 } }] } },
							ag: { $sum: { $cond: { if: { $ne: ['$_i_code', 200] }, then: 0, else: { $cond: { if: { $lte: ['$_i_tt', '$ApdexT.AA'] }, then: 1, else: 0 } } } } },
							aa: { $sum: { $cond: { if: { $ne: ['$_i_code', 200] }, then: 0, else: { $cond: { if: { $and: [{ $gt: ['$_i_tt', '$ApdexT.AA'] }, { $lte: ['$_i_tt', '$ApdexT.AC'] }] }, then: 1, else: 0 } } } } }
						}
					},
					{ $project: { value: { c: '$c', tt: '$tt', e: '$e', apdex: { $divide: [{ $add: ['$ag', { $divide: ['$aa', 2] }] }, '$c'] } } } },
					{ $sort: { _id: 1 } }
				],
				timings: [
					{
						$group: {
							_id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } },
							c: { $sum: 1 },
							r: { $sum: { $divide: [1, Q] } },
							tt: { $sum: '$_i_tt' },
							pt: { $sum: '$_i_pt' },
							code: { $first: '$_i_code' },
							e: { $sum: { $divide: [{ $multiply: [1.0, { $cond: { if: { $ne: ['$_i_code', 200] }, then: 1, else: 0 } }] }, Q] } },
							ag: { $sum: { $cond: { if: { $ne: ['$_i_code', 200] }, then: 0, else: { $cond: { if: { $lte: ['$_i_tt', '$ApdexT.AA'] }, then: 1, else: 0 } } } } },
							aa: { $sum: { $cond: { if: { $ne: ['$_i_code', 200] }, then: 0, else: { $cond: { if: { $and: [{ $gt: ['$_i_tt', '$ApdexT.AA'] }, { $lte: ['$_i_tt', '$ApdexT.AC'] }] }, then: 1, else: 0 } } } } }
						}
					},
					{ $project: { value: { c: '$c', r: '$r', tt: '$tt', pt: '$pt', code: '$code', e: '$e', ag: '$ag', aa: '$aa', apdex: { $divide: [{ $add: ['$ag', { $divide: ['$aa', 2] }] }, '$c'] }, tta: { $divide: ['$tt', '$c'] } } } },
					{ $sort: { _id: 1 } }
				],
				breakdown: [
					{ $group: { _id: '$_s_route', c: { $sum: 1 }, tt: { $sum: '$_i_tt' } } },
					{ $project: { value: { c: '$c', tt: '$tt' } } }
				]
			};
			_.forEach(p.facet, (n, key) => facet_obj[key] = store_facet[key]);
			if (!p.facet) {
				facet_obj = store_facet;
			}
			this.collections.page_reqs.aggregate([
				{ $match: query },
				{ $addFields: { 'ApdexT': { $arrayElemAt: [_arrApdex, { $indexOfArray: [_arrProjectIds, '$_idp'] }] } } },
				{ $facet: facet_obj }
			], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res[0])));
		}));
	}

	/**
	* Agregate ajax stats grouped by route
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{string},value:{apdex:number,c:number,e:number,tt:number}}>}
	*	Data grouped by ajax route
	*/
	getAjaxStats(t, p, cb) {
		p.facet = { stats: true };
		this.getAjaxMixStats(t, p, safe.sure(cb, (res) => cb(null, res.stats)));
	}

	getPageMixStats(t, p, cb) {
		let query = this.queryfix(p.filter);
		if (!query._idp.$in) {
			query._idp = { $in: [query._idp] };
		}
		let _arrApdex = [];
		let _arrProjectIds = [];
		safe.eachSeries(query._idp.$in, (current_query, cb) => this.ctx.api.assets.getProjectApdexConfig(t, {
			_id: current_query
		}, (err, apdex) => {
			if (!err) {
				_arrApdex.push({ AA: apdex._i_pagesT, AC: apdex._i_pagesT * 4 });
				_arrProjectIds.push(current_query);
			}
			cb();
		}), safe.sure(cb, () => {
			let Q = parseInt(p.quant) || 1;
			let _dt0 = new Date(0);
			let facet_obj = {};
			let store_facet = {
				stats: [
					{
						$group: {
							_id: '$_s_route',
							c: { $sum: 1 },
							tt: { $sum: '$_i_tt' },
							e: { $sum: { $multiply: [1.0, { $cond: { if: '$_i_err', then: 1, else: 0 } }] } },
							ag: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $lte: ['$_i_tt', '$ApdexT.AA'] }, then: 1, else: 0 } } } } },
							aa: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $and: [{ $gt: ['$_i_tt', '$ApdexT.AA'] }, { $lte: ['$_i_tt', '$ApdexT.AC'] }] }, then: 1, else: 0 } } } } }
						}
					},
					{ $project: { value: { c: '$c', tt: '$tt', e: '$e', ag: '$ag', aa: '$aa', apdex: { $divide: [{ $add: ['$ag', { $divide: ['$aa', 2] }] }, '$c'] } } } },
					{ $sort: { _id: 1 } }
				],
				timings: [
					{
						$group: {
							_id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } },
							c: { $sum: 1 },
							r: { $sum: { $divide: [1, Q] } },
							tt: { $sum: '$_i_tt' },
							e: { $sum: { $divide: [{ $cond: { if: '$_i_err', then: 1, else: 0 } }, Q] } },
							ag: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $lte: ['$_i_tt', '$ApdexT.AA'] }, then: 1, else: 0 } } } } },
							aa: { $sum: { $cond: { if: '$_i_err', then: 0, else: { $cond: { if: { $and: [{ $gt: ['$_i_tt', '$ApdexT.AA'] }, { $lte: ['$_i_tt', '$ApdexT.AC'] }] }, then: 1, else: 0 } } } } }
						}
					},
					{ $project: { value: { c: '$c', r: '$r', tt: '$tt', e: '$e', ag: '$ag', aa: '$aa', apdex: { $divide: [{ $add: ['$ag', { $divide: ['$aa', 2] }] }, '$c'] }, tta: { $divide: ['$tt', '$c'] } } } },
					{ $sort: { _id: 1 } }
				]
			};
			_.forEach(p.facet, (n, key) => facet_obj[key] = store_facet[key]);
			if (!p.facet) {
				facet_obj = store_facet;
			}
			this.collections.pages.aggregate([
				{ $match: query },
				{ $addFields: { 'ApdexT': { $arrayElemAt: [_arrApdex, { $indexOfArray: [_arrProjectIds, '$_idp'] }] } } },
				{ $facet: facet_obj }
			], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res[0])));
		}));
	}

	/**
	* Agregate page stats grouped by route
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{string},value:{apdex:number,c:number,e:number,tt:number}}>}
	*	Data grouped by page route
	*/
	getPageStats(t, p, cb) {
		p.facet = { stats: true };
		this.getPageMixStats(t, p, safe.sure(cb, (res) => cb(null, res.stats)));
	}


	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for page errors
	* @param {Object?} sort Sort order
	* @return {PageError}
	*/
	getPageError(t, p, cb) {
		let c = this.collections.page_errors.find(this.queryfix(p.filter));
		if (p.sort)
			c.sort(this.sortfix(p.sort));
		c.limit(1).toArray(safe.sure(cb, (errors) => {
			let error = errors.length ? errors[0] : null;
			if (!error)
				return cb(null, null);
			this.checkAccess(t, error, safe.sure(cb, () => cb(null, error)));
		}));
	}

	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._id Error id
	* @return {Array<{_id:string,
	* value:{route: string[],lang: string[],server: string[],
	* reporter: string[],count:integer}}>}
	*/
	getActionErrorInfo(t, p, cb) {
		let query = this.queryfix(p.filter);
		let ALL = !query.ehash;

		safe.run((cb) => {
			if (!query._id)
				// overwise we assume that called knows what to do
				return cb();
			// then we need to fetch it and grap required info (projec and ehash)
			this.collections.action_errors.findOne({ _id: query._id }, safe.sure(cb, (err) => {
				if (!err)
					return cb(new CustomError('No event found', 'Not Found'));

				query.ehash = err.ehash;
				delete query._id;

				cb();
			}));
		}, safe.sure(cb, () => this.checkAccess(t, query, safe.sure(cb, () => this.collections.action_errors.aggregate([
			{ $match: query },
			{
				$facet: {
					_id: [
						{ $group: { _id: ALL ? '$_idp' : '$ehash', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					],
					route: [
						{ $group: { _id: '$action._s_name', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					],
					reporter: [
						{ $group: { _id: '$_s_reporter', c: { $sum: 1 } } }
					],
					server: [
						{ $group: { _id: '$_s_server', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					],
					lang: [
						{ $group: { _id: '$_s_logger', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					]
				}
			}
		], { allowDiskUse: true }, safe.sure(cb, (tmpData) => {
			if (!tmpData[0]._id.length) {
				cb(null, { route: [], server: [], reporter: [], lang: [], count: 0 });
			}
			let tmp_id = tmpData[0]._id[0];
			let tmpRoute = tmpData[0].route;
			let tmpReporter = tmpData[0].reporter;
			let tmpServer = tmpData[0].server;
			let tmpLang = tmpData[0].lang;
			let res = { route: [], server: [], reporter: [], lang: [], count: tmp_id.c };
			_.forEach(tmpRoute, (v, k) => {
				if (v._id != null) {
					res.route.push({ k: v._id, v: v.c });
				}
			});
			_.forEach(tmpReporter, (v, k) => res.reporter[k] = { 'k': v._id, 'v': v.c });
			_.forEach(tmpServer, (v, k) => res.server[k] = { 'k': v._id, 'v': v.c });
			_.forEach(tmpLang, (v, k) => res.lang[k] = { 'k': v._id, 'v': v.c });
			cb(null, res);
		}))))));
	}

	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions errors
	* @param {Object?} sort Sort order
	* @return {PageError}
	*/
	getActionError(t, p, cb) {
		let c = this.collections.action_errors.find(this.queryfix(p.filter));
		if (p.sort)
			c.sort(this.sortfix(p.sort));
		c.limit(1).toArray(safe.sure(cb, (errors) => {
			let error = errors.length ? errors[0] : null;
			if (!error)
				return cb(null, null);
			this.checkAccess(t, error, safe.sure(cb, () => cb(null, error)));
		}));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,e:number,tt:number}}>}
	*/
	getAjaxTimings(t, p, cb) {
		p.facet = { timings: true };
		this.getAjaxMixStats(t, p, safe.sure(cb, (res) => cb(null, res.timings)));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,e:number,tt:number}}>}
	*/
	getPageTimings(t, p, cb) {
		p.facet = { timings: true };
		this.getPageMixStats(t, p, safe.sure(cb, (res) => cb(null, res.timings)));
	}

	/**
	* Get statistic information about page error by its id
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._id Error id
	* @return {Array<{_id:string,
	* 		value:{route: string[], browser: string[], os: string[],
	*		sessions: number, view: number, count: number}}>}
	*/
	getPageErrorInfo(t, p, cb) {
		let query = this.queryfix(p.filter);
		let ALL = !query.ehash;

		safe.run((cb) => {
			if (!query._id)
				// overwise we assume that called knows what to do
				return cb();
			// then we need to fetch it and grap required info (project and ehash)
			this.collections.page_errors.findOne({ _id: query._id }, safe.sure(cb, (event) => {
				if (!event)
					return cb(new CustomError('No event found', 'Not Found'));
				query.ehash = event.ehash;
				delete query._id;
				cb();
			}));
		}, safe.sure(cb, () => this.checkAccess(t, query, safe.sure(cb, () => this.collections.page_errors.aggregate([
			{ $match: query },
			{
				$facet: {
					_id: [
						{ $group: { _id: ALL ? '$_idp' : '$ehash', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					],
					route: [
						{ $group: { _id: '$request._s_route', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					],
					browser: [
						{ $group: { _id: { $concat: ['$agent.family', ' ', '$agent.major'] }, c: { $sum: 1 } } }
					],
					os: [
						{ $group: { _id: '$agent.os.family', c: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					],
					sessions: [
						{ $group: { _id: '$shash' } },
						{ $sort: { _id: 1 } }
					],
					views: [
						{ $group: { _id: '$_idpv' } },
						{ $sort: { _id: 1 } }
					]
				}
			}
		], { allowDiskUse: true }, safe.sure(cb, (tmpData) => {
			if (!tmpData[0]._id.length) {
				cb(null, { route: [], os: [], browser: [], count: 0, sessions: 0, views: 0 });
			}
			let tmp_id = tmpData[0]._id[0];
			let tmpRoute = tmpData[0].route;
			let tmpBrowser = tmpData[0].browser;
			let tmpOs = tmpData[0].os;
			let tmpSessions = tmpData[0].sessions;
			let tmpViews = tmpData[0].views;
			let res = {
				route: [],
				os: [],
				browser: [],
				count: tmp_id.c,
				sessions: tmpSessions.length,
				views: tmpViews.length
			};

			_.forEach(tmpRoute, (v, k) => {
				if (v._id == null) {
					v._id = 'undefined';
				}
				res.route.push({
					k: v._id,
					v: v.c
				});
			});
			_.forEach(tmpOs, (v, k) => res.os.push({
				k: v._id,
				v: v.c
			}));
			_.forEach(tmpBrowser, (v, k) => res.browser.push({
				k: v._id,
				v: v.c
			}));
			cb(null, res);
		}))))));

	}

	/**
	* Agregate page error stats grouped by error type (ehash)
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._id Page error id
	* @return {Array<{_id:{string},value:{count:number, pages: number,
	* sessions: number, _dtmax: date, _dtmin: date, error: PageError}}>}
	*/
	getPageErrorStats(t, p, cb) {
		let query = this.queryfix(p.filter);
		safe.run((cb) => {
			if (!query._id)
				// overwise we assume that called knows what to do
				return cb();
			// then we need to fetch it and grap required info (projec and ehash)
			this.collections.page_errors.findOne({ _id: query._id }, safe.sure(cb, (event) => {
				if (!event)
					return cb(new CustomError('No event found', 'Not Found'));
				query.ehash = event.ehash;
				delete query._id;
				cb();
			}));
		}, safe.sure(cb, () => this.checkAccess(t, query, safe.sure(cb, () => {
			let _dt0 = new Date(0);
			this.collections.page_errors.aggregate([
				{ $match: query },
				{
					$group: {
						_id: '$ehash',
						c: { $sum: 1 },
						session: { $addToSet: '$shash' },
						_dtmax: { $max: { $subtract: ['$_dt', _dt0] } },
						_dtmin: { $min: { $subtract: ['$_dt', _dt0] } },
						_id0: { $last: '$_id' },
						pages: { $push: '$_idpv' }
					}
				},
				{ $sort: { _id: 1 } }
			], { allowDiskUse: true }, safe.sure(cb, (stats) => {
				let ids = {};
				_.each(stats, (s) => ids[s._id0] = {
					stats: {
						_id: s._id0,
						count: s.c,
						session: s.session.length,
						_dtmax: s._dtmax,
						_dtmin: s._dtmin,
						pages: (s.pages.length ? s.pages.length : 1)
					}
				});
				this.collections.page_errors.find(this.queryfix({ _id: { $in: _.keys(ids) } }))
					.toArray(safe.sure(cb, (errors) => {
						_.each(errors, (e) => ids[e._id].error = e);
						let data = _.values(ids);
						cb(null, data);
					}));
			})
			);
		}))));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @param {String} filter._id Page error id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{r:number}}>}
	*/
	getPageErrorTimings(t, p, cb) {
		let query = this.queryfix(p.filter);
		safe.run((cb) => {
			if (!query._id)
				// overwise we assume that called knows what to do
				return cb();
			// then we need to fetch it and grap required info (projec and ehash)
			this.collections.page_errors.findOne({ _id: query._id }, safe.sure(cb, (event) => {
				if (!event)
					return cb(new CustomError('No event found', 'Not Found'));
				query._idp = event._idp;
				query.ehash = event.ehash;
				delete query._id;
				cb();
			}));
		}, safe.sure(cb, () => this.checkAccess(t, query, safe.sure(cb, () => {
			let Q = parseInt(p.quant) || 1; let _dt0 = new Date(0);
			this.collections.page_errors.aggregate([
				{ $match: query },
				{
					$group: {
						_id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } },
						r: { $sum: { $divide: [1, Q] } },
						_dt: { $first: '$_dt' }
					}
				},
				{ $project: { value: { r: '$r', _dt: '$_dt' } } },
				{ $sort: { _id: 1 } }
			], { allowDiskUse: true }, cb);
		}))));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{r:number}}>}
	*/
	getActionErrorTimings(t, p, cb) {
		let query1 = this.queryfix(p.filter);
		let Q = parseInt(p.quant) || 1;
		this.collections.action_errors.findOne(query1, safe.sure(cb, (event) => {
			if (event) {
				let query = (query1._id) ? {
					_idp: event._idp,
					_s_message: event._s_message,
					_dt: query1._dt
				} : query1;
				this.checkAccess(t, query, safe.sure(cb, () => {
					let _dt0 = new Date(0);
					this.collections.action_errors.aggregate([
						{ $match: query },
						{
							$group: {
								_id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } },
								r: { $sum: { $divide: [1, Q] } }
							}
						},
						{ $project: { value: { r: '$r' } } },
						{ $sort: { _id: 1 } }
					], { allowDiskUse: true }, cb);
				}));
			} else {
				cb(null, '');
			}
		}));
	}

	/**
	* Agregate action error stats grouped by error type (ehash)
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{string},value:{c:number,
	* _dtmax: date, _dtmin: date, error: ActionError}}>}
	*/
	getActionErrorStats(t, p, cb) {
		let query = this.queryfix(p.filter);
		this.checkAccess(t, query, safe.sure(cb, () => {
			let _dt0 = new Date(0);
			this.collections.action_errors.aggregate([
				{ $match: query },
				{
					$group:
					{
						_id: '$ehash', c: { $sum: 1 }, _dtmax: { $max: { $subtract: ['$_dt', _dt0] } },
						_dtmin: { $min: { $subtract: ['$_dt', _dt0] } }, _id0: { $last: '$_id' }
					}
				},
				{ $project: { value: { _id: '$_id0', c: '$c', _dtmax: '$_dtmax', _dtmin: '$_dtmin' } } },
				{ $sort: { _id: 1 } }
			], { allowDiskUse: true }, safe.sure(cb, (stats) => {
				let ids = {};
				_.forEach(stats, (s) => ids[s.value._id] = { stats: s.value, error: s._id });
				this.collections.action_errors.find(this.queryfix({ _id: { $in: _.keys(ids) } }))
					.toArray(safe.sure(cb, (errors) => {
						_.forEach(errors, (e) => ids[e._id].error = e);
						let data = _.values(ids);
						cb(null, data);
					}));
			}));
		}));
	}

	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @param {String} filter._s_name Action name
	* @return {Array<{_id:{string},value:{c:number,
	* tt: number, ot: number}}>}
	*/
	getActionBreakdown(t, p, cb) {
		let query = this.queryfix(p.filter);
		this.checkAccess(t, query, safe.sure(cb, () => this.collections.action_stats.aggregate([
			{ $match: query },
			{ $unwind: '$data' },
			{ $group: { _id: '$data._s_name', c: { $sum: '$data._i_cnt' }, tt: { $sum: '$data._i_tt' }, ot: { $sum: '$data._i_own' }, _s_cat: { $last: '$data._s_cat' } } },
			{ $project: { value: { c: '$c', tt: '$tt', ot: '$ot' }, _s_cat: '$_s_cat' } },
			{ $sort: { _id: 1 } }
		], { allowDiskUse: true }, cb)));
	}


	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @param {String} filter._s_route Page route
	* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
	*/
	getPageBreakdown(t, p, cb) {
		let query = this.queryfix(p.filter);
		this.checkAccess(t, query, safe.sure(cb, () => this.collections.page_reqs.aggregate([
			{ $match: query },
			{ $group: { _id: '$_s_name', c: { $sum: 1 }, tt: { $sum: '$_i_tt' } } },
			{ $project: { value: { c: '$c', tt: '$tt' } } },
			{ $sort: { _id: 1 } }
		], { allowDiskUse: true }, cb)));
	}

	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @param {String} filter._s_name Ajax name
	* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
	*/
	getAjaxBreakdown(t, p, cb) {
		p.facet = { breakdown: true };
		this.getAjaxMixStats(t, p, safe.sure(cb, (res) => cb(null, res.breakdown)));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{c: number, mem: number, mema: number}}>}
	*/
	getMetricTimings(t, p, cb) {
		let query = this.queryfix(p.filter);
		this.checkAccess(t, query, safe.sure(cb, () => {
			let Q = parseInt(p.quant) || 1;
			let _dt0 = new Date(0);
			this.collections.metrics.aggregate([
				{ $match: query },
				{ $group: { _id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } }, mem: { $sum: '$_f_val' }, c: { $sum: '$_i_cnt' } } },
				{ $project: { value: { mem: '$mem', c: '$c', mema: { $divide: ['$mem', '$c'] } } } },
				{ $sort: { _id: 1 } }
			], { allowDiskUse: true }, cb);
		}));
	}

	getActionSegmentMix(t, p, cb) {
		let query = this.queryfix(p.filter);
		this.checkAccess(t, query, safe.sure(cb, () => {
			let Q = parseInt(p.quant) || 1;
			let _dt0 = new Date(0);
			let CAT = query['data._s_cat'];
			let NAME = p.filter['data._s_name'];
			let facet_obj = {};
			let store_facet = {
				stats: [
					{ $match: { 'data._s_cat': CAT } },
					{
						$group: {
							_id: '$data._s_name',
							tt: { $sum: '$data._i_tt' },
							c: { $sum: '$data._i_cnt' }
						}
					},
					{ $project: { value: { tt: '$tt', c: '$c' } } },
					{ $sort: { _id: 1 } }
				],
				timings: [
					{ $match: { 'data._s_cat': CAT } },
					{
						$group: {
							_id: { $trunc: { $divide: [{ $subtract: ['$_dt', _dt0] }, { $multiply: [Q, 60000] }] } },
							c: { $sum: '$data._i_cnt' },
							r: { $sum: { $divide: ['$data._i_cnt', Q] } },
							tt: { $sum: '$data._i_tt' }
						}
					},
					{ $project: { value: { c: '$c', r: '$r', tt: '$tt', tta: { $divide: ['$tt', '$c'] } } } },
					{ $sort: { _id: 1 } }
				],
				breakdown: [
					{ $match: { 'data._s_name': NAME } },
					{ $group: { _id: '$_s_name', c: { $sum: '$data._i_cnt' }, tt: { $sum: '$data._i_tt' }, last_s_cat: { $last: '$_s_cat' } } },
					{ $project: { value: { c: '$c', tt: '$tt' }, last_s_cat: '$last_s_cat' } },
					{ $sort: { _id: 1 } }
				]
			};
			_.forEach(p.facet, (n, key) => facet_obj[key] = store_facet[key]);
			if (!p.facet) {
				facet_obj = store_facet;
			}
			this.collections.action_stats.aggregate([
				{ $match: query },
				{ $unwind: '$data' },
				{ $facet: facet_obj }
			], { allowDiskUse: true }, safe.sure(cb, (res) => cb(null, res[0])));
		}));
	}

	/**
	* Agregate action segement stats by ame (ehash)
	*
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @param {String} filter.data._s_cat Segment category
	* @return {Array<{_id:{string},value:{c:number, tt: number}}>}
	*/
	getActionSegmentStats(t, p, cb) {
		p.facet = { stats: true };
		this.getActionSegmentMix(t, p, safe.sure(cb, (res) => cb(null, res.stats)));
	}

	/**
	* @param {String} token Auth token
	* @param {Integer} quant Amount of minutes in time slot
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{c: number, r: number, tt: number, tta: number}}>}
	*/
	getActionSegmentTimings(t, p, cb) {
		p.facet = { timings: true };
		this.getActionSegmentMix(t, p, safe.sure(cb, (res) => cb(null, res.timings)));
	}

	/**
	* @param {String} token Auth token
	* @param {Object} filter Filter for actions
	* @param {String} filter._idp Project id
	* @param {String} filter._s_name Ajax name
	* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
	*/
	getActionSegmentBreakdown(t, p, cb) {
		p.facet = { breakdown: true };
		this.getActionSegmentMix(t, p, safe.sure(cb, (res) => cb(null, res.breakdown)));
	}

	checkAccess(token, query, cb) {
		this.ctx.api.obac.getPermissions(token, { rules: [{ _id: query._idp, action: 'project_view' }] }, safe.sure(cb, (res) => {
			if (!res.project_view[query._idp])
				return cb(new CustomError('Current user is unknown', 'Unauthorized'));
			cb();
		}));
	}

	getIndex(t, { req, res }, cb) {
		safe.auto({
			data: cb => this.getIndexData({ req, res }, cb),
			teams: cb => this.getIndexTeams({ req, res }, cb),
			metrics: ['data', 'teams', (cb, r) => this.getIndexMetrics(r, cb)]
		}, safe.sure(cb, r => cb(null, r.metrics)));
	}

	getIndexData({ req, res }, cb) {
		let tolerance = 5 * 60 * 1000;
		let dtend = parseInt((Date.now() + tolerance) / tolerance) * tolerance;
		let dtstart = res.locals.dtend - 20 * 60 * 1000;

		safe.run(cb => {
			this.ctx.api.web.getFeed(res.locals.token, {
				_t_age: this.quant + 'm', feed: 'mainres.homeInfo', params: {
					quant: this.quant, fv: req.query.fv, filter: {
						_dt: { $gt: dtstart, $lte: dtend }
					}
				}
			}, cb);
		}, safe.sure(cb, result => {

			for (let r of result) {
				let period;
				let errAck = r.result.errAck;
				let apdex = {}, server = {}, client = {}, ajax = {};

				client.r = client.e = client.etu = 0;
				apdex.client = apdex.server = apdex.ajax = 0;
				ajax.r = ajax.e = ajax.etu = 0;
				server.r = server.e = server.etu = server.proc = server.mem = 0;

				if (r.result.views.length) {
					period = r.result.views.length;
					_.each(r.result.views, (v) => {
						v = v.value;
						client.r += v.r;
						client.etu += v.tta;
						client.e += v.e / v.r;
						apdex.client += v.apdex;
					});

					client.r = client.r / period;
					client.etu = client.etu / period / 1000;
					client.e = client.e / period;
					apdex.client = apdex.client / period;
				}

				if (r.result.ajax.length) {
					period = r.result.ajax.length;
					_.forEach(r.result.ajax, (v) => {
						v = v.value;
						ajax.r += v.r;
						ajax.etu += v.tta;
						ajax.e += v.e / v.r;
						apdex.ajax += v.apdex;
					});

					ajax.etu = ajax.etu / period / 1000;
					ajax.e = ajax.e / period;
					ajax.r = ajax.r / period;
					apdex.ajax = apdex.ajax / period;
				}

				if (r.result.actions.length) {
					period = r.result.actions.length;
					_.forEach(r.result.actions, (v) => {
						v = v.value;
						server.e += v.e / v.r;
						server.r += v.r;
						server.etu += v.tta;
						apdex.server += v.apdex;
					});

					server.etu = server.etu / period / 1000;
					server.r = server.r / period;
					server.e = server.e / period;
					apdex.server = apdex.server / period;
				}

				if (r.result.metrics) {
					server.proc = r.result.metrics.proc;
					server.mem = r.result.metrics.mem;
				}

				_.assign(r, { apdex, server, client, ajax, errAck });

			}

			cb(null, result);
		}));
	}

	getIndexTeams({ req, res }, cb) {

		safe.run(cb => {
			this.ctx.api.users.getCurrentUser(res.locals.token, {}, cb);
		}, safe.sure(cb, usr => {
			if (!usr.favorites || !usr.favorites.length) {
				this.ctx.api.assets.getTeams(res.locals.token, { _t_age: this.quant + 'm' }, safe.sure(cb, teams => {
					cb(null, { teams, fv: 'ALL' });
				}));

			} else {
				if (req.query.fv == 'ALL') {
					this.ctx.api.assets.getTeams(res.locals.token, { _t_age: this.quant + 'm' }, safe.sure(cb, teams => {
						cb(null, { teams, fv: 'ALL' });
					}));
				}
				else {
					let idf = _.map(usr.favorites, '_idf');
					this.ctx.api.assets.getTeams(res.locals.token, { _t_age: this.quant + 'm', filter: { _id: { $in: idf } } }, safe.sure(cb, teams => {
						cb(null, { teams, fv: 'FAV' });
					}));
				}
			}
		}));

	}

	getIndexMetrics(r, cb) {
		let { teams, fv } = r.teams;

		for (let team of teams) {

			let projects = {};
			for (const proj of r.data) {
				projects[proj._id] = proj;
			}

			for (let proj of team.projects) {
				proj._t_proj = projects[proj._idp];
			}

			let tmetrics = {};

			for (let proj of team.projects) {
				_.assignInWith(tmetrics, _.pick(proj._t_proj, ['apdex', 'server', 'client', 'errAck', 'ajax']), (oval, sval, key) => {
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
				});
			}

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

		cb(null, { teams, fv });
	}

}

module.exports.init = (ctx, cb) => {

	safe.auto({
		db: cb => ctx.api.mongo.getDb({}, cb),
		collections: ['db', async (...args) => {
			for (let collection of collections) {
				collections[collection] = await args[1].db.collection(collection);
			}
			return collections;
		}]
	}, safe.sure(cb, r => {
		cb(null, { api: new Api({ ctx, collections: r.collections }) });
	}));

};
