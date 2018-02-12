"use strict";
var _ = require("lodash");
var safe = require("safe");
var CustomError = require('tinyback').CustomError;
module.exports.deps = ['mongo','prefixify','validate'];

module.exports.init = function (ctx, cb) {
	var queryfix = ctx.api.prefixify.queryfix;
	var sortfix = ctx.api.prefixify.sort;
	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.parallel([
			function (cb) {
				db.collection("page_errors",cb);
			},
			function (cb) {
				db.collection("pages",cb);
			},
			function (cb) {
				db.collection("page_reqs", cb);
			},
			function (cb) {
				db.collection("actions", cb);
			},
			function (cb) {
				db.collection("action_stats", cb);
			},
			function (cb) {
				db.collection("action_errors", cb);
			},
			function (cb) {
				db.collection("metrics", cb);
			}
		],safe.sure_spread(cb, function (events,pages,ajax, actions, as, serverErrors, metrics) {
			cb(null, {

/**
* REST API to request various statistics information, all functions readonly
*
* @exports StatsApi
*/
api:{

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
getErrorTotals: function(t,p,cb) {
	checkAccess(t, p, safe.sure(cb, function () {
		safe.parallel({
			actions:function(cb) {
				var q = {
					_idp: p._idp,
					_dt: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtActionsErrAck
					}
				};
				q = queryfix(q);
				serverErrors.aggregate([{$match:q},{$group:{_id:"$ehash"}}], {allowDiskUse: true}, safe.sure(cb, function (res) {
					cb(null, res.length);
				}));
			},
			dtlActions: function(cb) {
				var q = {
					_idp: p._idp,
					_dtf: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtActionsErrAck
					}
				};
				q = queryfix(q);
				serverErrors.aggregate([{$match:q},{$group:{_id:"$ehash"}}], {allowDiskUse: true}, safe.sure(cb, function (res) {
					cb(null, res.length);
				}));
			},
			pages:function(cb) {
				var q = {
					_idp: p._idp,
					_dt: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtPagesErrAck
					}
				};
				q = queryfix(q);
				events.aggregate([{$match:q},{$group:{_id:"$ehash"}}], {allowDiskUse: true}, safe.sure(cb, function (res) {
					cb(null, res.length);
				}));
			},
			dtlPages: function(cb) {
				var q = {
					_idp: p._idp,
					_dtf: {
						$lte: p._dt.$lte,
						$gt: p._dt._dtPagesErrAck
					}
				};
				q = queryfix(q);
				events.aggregate([{$match:q},{$group:{_id:"$ehash"}}], {allowDiskUse: true}, safe.sure(cb, function (res) {
					cb(null, res.length);
				}));
			}
		},cb);
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{proc:number, mem:number}>}
*/
getMetricTotals: function(t, p, cb) {
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		metrics.aggregate([
			{$match: query},
			{$group: {_id: "$_s_pid",  mem1: {$sum: "$_f_val"}, c1: {$sum: "$_i_cnt"}}}
		], {allowDiskUse: true},
		safe.sure(cb, function(res) {
				var memtt = 0;
				_.forEach(res,function(r) {
					memtt += r.mem1/r.c1;
				});
				cb(null,{proc: res.length, mem: Math.round(memtt)});
			})
		);
	}));
},

getActionMixStats:getActionMixStats,

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,tt:number}}>}
*/
getActionTimings: function(t, p, cb) {
	p.facet = {timings:true};
	getActionMixStats(t, p, function (err, res) {
		cb (null, res.timings);
	});
},
/**
* Agregate actions stats grouped by name
*
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{string},value:{apdex:number,c:number,tt:number}}>}
*	Data grouped by action name
*/
getActionStats: function(t, p , cb) {
	p.facet = {stats:true};
	getActionMixStats(t, p, function (err, res) {
		cb (null, res.stats);
	});
},

getAjaxMixStats:getAjaxMixStats,

/**
* Agregate ajax stats grouped by route
*
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{string},value:{apdex:number,c:number,e:number,tt:number}}>}
*	Data grouped by ajax route
*/
getAjaxStats: function(t, p, cb) {
	p.facet = {stats:true};
	getAjaxMixStats(t, p, function (err, res) {
		cb (null, res.stats);
	});
},

getPageMixStats:getPageMixStats,

/**
* Agregate page stats grouped by route
*
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{string},value:{apdex:number,c:number,e:number,tt:number}}>}
*	Data grouped by page route
*/
getPageStats: function(t, p, cb) {
	p.facet = {stats:true};
	getPageMixStats(t, p, function (err, res) {
		cb (null, res.stats);
	});
},


/**
* @param {String} token Auth token
* @param {Object} filter Filter for page errors
* @param {Object?} sort Sort order
* @return {PageError}
*/
getPageError:function (t, p, cb) {
	var c = events.find(queryfix(p.filter));
	if (p.sort)
		c.sort(sortfix(p.sort));
	c.limit(1).toArray(safe.sure(cb, function (errors){
		var error = errors.length?errors[0]:null;
		if (!error)
			return cb(null, null);
		checkAccess(t,error,safe.sure(cb, function () {
			cb(null, error);
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._id Error id
* @return {Array<{_id:string,
* 		value:{route: string[],lang: string[],server: string[],
*		reporter: string[],count:integer}}>}
*/
getActionErrorInfo:function (t, p, cb) {
	var query = queryfix(p.filter);
	var ALL = !query.ehash;

	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		serverErrors.findOne({_id: query._id}, safe.sure(cb, function (err) {
			if (!err)
				return cb(new CustomError("No event found", "Not Found"));

			query.ehash = err.ehash;
			delete query._id;

			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			serverErrors.aggregate([
				{$match: query},
				{$facet: {
					_id: [
						{$group: {_id: ALL ? "$_idp" : "$ehash",c: {$sum: 1}}},
						{$sort: {_id: 1}}
					],
					route: [
						{$group: {_id: "$action._s_name",c: {$sum: 1}}},
						{$sort: {_id: 1}}
					],
					reporter: [
						{$group: {_id: "$_s_reporter",c: {$sum: 1}}}
					],
					server: [
						{$group: {_id: "$_s_server",c: {$sum: 1}}},
						{$sort: {_id: 1}}
					],
					lang: [
						{$group: {_id: "$_s_logger",c: {$sum: 1}}},
						{$sort: {_id: 1}}
					]}
				}
			], {allowDiskUse: true},
			safe.sure(cb, function(tmpData) {
				if (!tmpData[0]._id.length) {
					return cb(null, {route: [],server: [],reporter: [],lang: [],count:0});
				}
				var tmp_id = tmpData[0]._id[0];
				var tmpRoute = tmpData[0].route;
				var tmpReporter = tmpData[0].reporter;
				var tmpServer = tmpData[0].server;
				var tmpLang = tmpData[0].lang;
				var res = {route: [],server: [],reporter: [],lang: [],count:tmp_id.c};
				_.each(tmpRoute, function(v, k) {
					if (v._id != null) {
						res.route.push({k: v._id, v: v.c});
					}
				});
				_.each(tmpReporter, function(v, k) {
					res.reporter[k] = {"k": v._id, "v": v.c};
				});
				_.each(tmpServer, function(v, k) {
					res.server[k] = {"k": v._id, "v": v.c};
				});
				_.each(tmpLang, function(v, k) {
					res.lang[k] = {"k": v._id, "v": v.c};
				});
				cb(null, res);
			}));
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions errors
* @param {Object?} sort Sort order
* @return {PageError}
*/
getActionError:function (t, p, cb) {
	var c = serverErrors.find(queryfix(p.filter));
	if (p.sort)
		c.sort(sortfix(p.sort));
	c.limit(1).toArray(safe.sure(cb, function (errors){
		var error = errors.length?errors[0]:null;
		if (!error)
			return cb(null, null);
		checkAccess(t,error,safe.sure(cb, function () {
			cb(null, error);
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,e:number,tt:number}}>}
*/
getAjaxTimings:function(t, p, cb) {
	p.facet = {timings:true};
	getAjaxMixStats(t, p, function (err, res) {
		cb (null, res.timings);
	});
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,e:number,tt:number}}>}
*/
getPageTimings:function (t, p, cb) {
	p.facet = {timings:true};
	getPageMixStats(t, p, function (err, res) {
		cb (null, res.timings);
	});
},

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
getPageErrorInfo:function (t, p, cb) {
	var query = queryfix(p.filter);
	var ALL = !query.ehash;

	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (project and ehash)
		events.findOne({_id:query._id}, safe.sure(cb, function (event) {
			if (!event)
				return cb(new CustomError("No event found", "Not Found"));
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			events.aggregate([
				{$match: query},
				{$facet: {
					_id: [
						{$group: {_id: ALL ? "$_idp" : "$ehash",c: {$sum: 1}}},
						{$sort: {_id: 1}}
					],
					route: [
						{$group: {_id: "$request._s_route",	c: {$sum: 1}}},
						{$sort: {_id: 1}}
					],
					browser: [
						{$group: {_id: {$concat: ["$agent.family", " ", "$agent.major"]},c: {$sum: 1}}}
					],
					os: [
						{$group: {_id: "$agent.os.family",c: {$sum: 1}}},
						{$sort: {_id: 1}}
					],
					sessions: [
						{$group: {_id: "$shash"}},
						{$sort: {_id: 1}}
					],
					views: [
						{$group: {_id: "$_idpv"}},
						{$sort: {_id: 1}}
					]}
				}
			], {allowDiskUse: true},
			safe.sure(cb, function(tmpData) {
				if (!tmpData[0]._id.length) {
					return cb(null, {route: [], os: [], browser: [], count:0, sessions:0, views:0});
				}
				var tmp_id = tmpData[0]._id[0];
				var tmpRoute = tmpData[0].route;
				var tmpBrowser = tmpData[0].browser;
				var tmpOs = tmpData[0].os;
				var tmpSessions = tmpData[0].sessions;
				var tmpViews = tmpData[0].views;
				var res = {
					route: [],
					os: [],
					browser: [],
					count: tmp_id.c,
					sessions: tmpSessions.length,
					views: tmpViews.length
				};

				_.each(tmpRoute, function(v, k) {
					if (v._id == null) {
						v._id = "undefined";
					}
					res.route.push({
						k: v._id,
						v: v.c
					});
				});
				_.each(tmpOs, function(v, k) {
					res.os.push({
						k: v._id,
						v: v.c
					});
				});
				_.each(tmpBrowser, function(v, k) {
					res.browser.push({
						k: v._id,
						v: v.c
					});
				});
				cb(null, res);
			}));
}));}));

},

/**
* Agregate page error stats grouped by error type (ehash)
*
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._id Page error id
* @return {Array<{_id:{string},value:{count:number, pages: number,
*	sessions: number, _dtmax: date, _dtmin: date, error: PageError}}>}
*/
getPageErrorStats:function (t, p, cb) {
	var query = queryfix(p.filter);
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		events.findOne({_id:query._id}, safe.sure(cb, function (event) {
			if (!event)
				return cb(new CustomError("No event found", "Not Found"));
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			var _dt0 = new Date(0);
			events.aggregate([
				{$match: query},
				{$group: {_id: "$ehash",
						c: {$sum: 1},
						session: {$addToSet: "$shash"},
						_dtmax: {$max: {$subtract: ["$_dt", _dt0]}},
						_dtmin: {$min: {$subtract: ["$_dt", _dt0]}},
						_id0: {$last: "$_id"},
						pages: {$push: "$_idpv"}}
				},
				{$sort: {_id: 1}}
			], {allowDiskUse: true},
				safe.sure(cb, function(stats) {
					var ids = {};
					_.each(stats, function(s) {
						ids[s._id0] = {
							stats: {
								_id: s._id0,
								count: s.c,
								session: s.session.length,
								_dtmax: s._dtmax,
								_dtmin: s._dtmin,
								pages: (s.pages.length ? s.pages.length : 1)
							}
						};
					});
					events.find(queryfix({_id: {$in: _.keys(ids)}}))
						.toArray(safe.sure(cb, function(errors) {
							_.each(errors, function(e) {
								ids[e._id].error = e;
							});
							var data = _.values(ids);
							cb(null, data);
						}));
				})
			);
	}));}));
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._id Page error id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{r:number}}>}
*/
getPageErrorTimings:function(t, p, cb) {
	var query = queryfix(p.filter);
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		events.findOne({_id:query._id}, safe.sure(cb, function (event) {
			if (!event)
				return cb(new CustomError("No event found", "Not Found"));
			query._idp = event._idp;
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			var Q = parseInt(p.quant) || 1; var _dt0 = new Date(0);
			events.aggregate([
				{$match: query},
				{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},
						r: {$sum: {$divide: [1, Q]}},
						_dt: {$first: "$_dt"}}
				},
				{$project: {value: {r: "$r",_dt: "$_dt"}}},
				{$sort: {_id: 1}}
			], {allowDiskUse: true}, cb);
}));}));
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{r:number}}>}
*/
getActionErrorTimings:function(t, p, cb) {
	var query1 = queryfix(p.filter);
	var Q = parseInt(p.quant) || 1;
	serverErrors.findOne(query1, safe.sure(cb, function(event) {
		if (event) {
			var query = (query1._id) ? {
				_idp: event._idp,
				_s_message: event._s_message,
				_dt: query1._dt
			} : query1;
			checkAccess(t, query, safe.sure(cb, function() {
				var _dt0 = new Date(0);
				serverErrors.aggregate([
					{$match: query},
					{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},
							r: {$sum: {$divide: [1, Q]}}}
					},
					{$project: {value: {r: "$r"}}},
					{$sort: {_id: 1}}
				], {allowDiskUse: true}, cb);
			}));
		} else {
			cb(null, '');
		}
	}));
},

/**
* Agregate action error stats grouped by error type (ehash)
*
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{string},value:{c:number,
*	_dtmax: date, _dtmin: date, error: ActionError}}>}
*/
getActionErrorStats:function (t, p, cb) {
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		var _dt0 = new Date(0);
		serverErrors.aggregate([
				{$match: query},
				{$group:
					{_id: "$ehash", c: {$sum: 1}, _dtmax: {$max: {$subtract: ["$_dt", _dt0]}},
					_dtmin: {$min: {$subtract: ["$_dt", _dt0]}}, _id0: {$last: "$_id"} }
				},
				{$project: {value: {_id: "$_id0", c: "$c", _dtmax: "$_dtmax", _dtmin: "$_dtmin"}}},
				{$sort: {_id: 1}}
		], {allowDiskUse: true},
		safe.sure(cb, function (stats) {
			var ids = {};
			_.each(stats, function (s) {
				ids[s.value._id]={stats:s.value, error: s._id};
			} );
			serverErrors.find(queryfix({_id:{$in:_.keys(ids)}}))
				.toArray(safe.sure(cb, function (errors) {
					_.each(errors, function (e) {
						ids[e._id].error = e;
					});
					var data = _.values(ids);
					cb(null, data);
				}));
		}));
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._s_name Action name
* @return {Array<{_id:{string},value:{c:number,
*	tt: number, ot: number}}>}
*/
getActionBreakdown: function(t,p, cb) {
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		as.aggregate([
			{$match: query},
			{$unwind: "$data"},
			{$group: {_id: "$data._s_name",	c: {$sum: "$data._i_cnt"},tt: {$sum: "$data._i_tt"},ot: {$sum: "$data._i_own"}}},
			{$project: {value: {c: "$c",tt: "$tt",ot: "$ot"}}},
			{$sort: {_id: 1}}
		], {allowDiskUse: true}, cb);
	}));
},


/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._s_route Page route
* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
*/
getPageBreakdown: function(t,p,cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ajax.aggregate([
			{$match: query},
			{$group: {_id: "$_s_name", c: {$sum: 1}, tt: {$sum: "$_i_tt"}}},
			{$project: {value: {c: "$c", tt: "$tt"}}},
			{$sort: {_id: 1}}
		],{allowDiskUse: true}, cb);
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._s_name Ajax name
* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
*/
getAjaxBreakdown: function(t,p,cb) {
	p.facet = {breakdown:true};
	getAjaxMixStats(t, p, function (err, res) {
		cb (null, res.breakdown);
	});
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{c: number, mem: number, mema: number}}>}
*/
getMetricTimings:function(t,p,cb) {
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function() {
		var Q = parseInt(p.quant) || 1;
		var _dt0 = new Date(0);
		metrics.aggregate([
			{$match: query},
			{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},	mem: {$sum: "$_f_val"},	c: {$sum: "$_i_cnt"}}},
			{$project: {value: {mem: "$mem", c: "$c", mema: {$divide: ["$mem", "$c"]}}}},
			{$sort: {_id: 1}}
		], {allowDiskUse: true}, cb);
	}));
},

getActionSegmentMix:getActionSegmentMix,

/**
* Agregate action segement stats by ame (ehash)
*
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter.data._s_cat Segment category
* @return {Array<{_id:{string},value:{c:number, tt: number}}>}
*/
getActionSegmentStats: function(t,p, cb) {
	p.facet = {stats:true};
	getActionSegmentMix(t, p, function (err, res) {
		cb (null, res.stats);
	});
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{c: number, r: number, tt: number, tta: number}}>}
*/
getActionSegmentTimings:function (t, p, cb) {
	p.facet = {timings:true};
	getActionSegmentMix(t, p, function (err, res) {
		cb (null, res.timings);
	});
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._s_name Ajax name
* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
*/
getActionSegmentBreakdown: function(t,p, cb) {
	p.facet = {breakdown:true};
	getActionSegmentMix(t, p, function (err, res) {
		cb (null, res.breakdown);
	});
}

}});


function checkAccess(token, query, cb ) {
	ctx.api.obac.getPermissions(token, {rules:[{_id:query._idp, action:'project_view'}]}, safe.sure(cb, function (res) {
		if (!res.project_view[query._idp])
			return cb(new CustomError('Current user is unknown',"Unauthorized"));
		cb();
	}));
}

function getActionSegmentMix(t, p, cb) {
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		var Q = parseInt(p.quant) || 1;
		var _dt0 = new Date(0);
		var CAT = query['data._s_cat'];
		var NAME = p.filter["data._s_name"];
		var facet_obj = {};
		var store_facet = {
			stats:[
				{$match: {"data._s_cat": CAT}},
				{$group: {_id: "$data._s_name",
							tt:  {$sum :"$data._i_tt"},
							c: {$sum:"$data._i_cnt"}
						}
				},
				{$project: {value: {tt: "$tt",c: "$c"}}},
				{$sort: {_id: 1}}
			],
			timings:[
				{$match: {"data._s_cat": CAT}},
				{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},
										c: {$sum: "$data._i_cnt"},
										r: {$sum: {$divide: ["$data._i_cnt", Q]}},
										tt: {$sum: "$data._i_tt"}
									}
				},
				{$project: {value: {c: "$c", r: "$r", tt: "$tt", tta: {$divide: ["$tt", "$c"]}}}},
				{$sort: {_id: 1}}
			],
			breakdown:[
				{$match: {"data._s_name": NAME}},
				{$group: {_id: "$_s_name", c: {$sum: "$data._i_cnt"}, tt: {$sum: "$data._i_tt"}}},
				{$project: {value: {c: "$c", tt: "$tt"}}},
				{$sort: {_id: 1}}
			]
		};
		_.forEach(p.facet, function(n,key){
			facet_obj[key] = store_facet[key];
		});
		if (!p.facet) {
			facet_obj = store_facet;
		}
		as.aggregate([
			{$match: query},
			{$unwind: "$data"},
			{$facet: facet_obj}
		],{allowDiskUse: true},safe.sure(cb,function (res) {
			 cb(null, res?res[0]:{ timings: []});
		}));
	}));
}

function getActionMixStats(t, p , cb) {
	var query = queryfix(p.filter);
	if (!query._idp.$in) {
		query._idp={$in:[query._idp]};
	}
	var _arrApdex = [];
	var _arrProjectIds = [];

	safe.eachSeries(query._idp.$in, function(current_query, cb) {
		ctx.api.assets.getProjectApdexConfig(t, {
			_id: current_query
		}, function (err, apdex) {
			if (!err) {
				_arrApdex.push({AA:apdex._i_serverT,AC:apdex._i_serverT*4});
				_arrProjectIds.push(current_query);
			}
			cb();
		});
	}, safe.sure(cb, function() {
		var Q = parseInt(p.quant) || 1;
		var _dt0 = new Date(0);
		var facet_obj = {};
		var store_facet = {
			stats:[
				{$group: {_id: "$_s_name",
						c: {$sum: 1},
						tt: {$sum: "$_i_tt"},
						ag: {$sum: {$cond: {if: "$_i_err", then: 0, else: {	$cond: {if: {$lte: ["$_i_tt", "$ApdexT.AA"]}, then: 1, else: 0}}}}},
						aa: {$sum: {$cond: {if: "$_i_err", then: 0, else: {	$cond: {if: {$and: [{$gt: ["$_i_tt", "$ApdexT.AA"]},{$lte: ["$_i_tt", "$Apdex.AC"]}]},then: 1, else: 0}}}}}}
				},
				{$project: {value: {c: "$c", tt: "$tt",	apdex: {$divide: [{$add: ["$ag", {$divide: ["$aa", 2]}]}, "$c"]}}}},
				{$sort: {_id: 1}}
			],
			timings:[
				{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},
						c: {$sum: 1},
						r: {$sum: {$divide: [1, Q]}},
						e: {$sum: {$divide: [{$cond: {if: "$_i_err", then: 1, else: 0}}, Q]}},
						tt: {$sum: "$_i_tt"},
						ag: {$sum: {$cond: {if: "$_i_err", then: 0, else: {$cond: {if: {$lte: ["$_i_tt", "$ApdexT.AA"]}, then: 1, else: 0}}}}},
						aa: {$sum: {$cond: {if: "$_i_err", then: 0, else: {$cond: {if: {$and: [{$gt: ["$_i_tt", "$ApdexT.AA"]}, {$lte: ["$_i_tt", "$ApdexT.AC"]}]}, then: 1, else: 0}}}}}}
				},
				{$project: {value: {c: "$c",r: "$r",e: "$e",tt: "$tt",ag: "$ag",aa: "$aa",apdex: {$divide: [{$add: ["$ag", {$divide: ["$aa", 2]}]}, "$c"]},	tta: {$divide: ["$tt", "$c"]}}}},
				{$sort: {_id: 1}}
			]
		};
		_.forEach(p.facet, function(n,key){
			facet_obj[key] = store_facet[key];
		});
		if (!p.facet) {
			facet_obj = store_facet;
		}
		actions.aggregate([
			{$match: query},
			{ $addFields: { "ApdexT": { $arrayElemAt: [_arrApdex, { $indexOfArray: [_arrProjectIds, "$_idp"] }] } } },
			{$facet: facet_obj}
		],{allowDiskUse: true},safe.sure(cb,function (res) {
			 cb(null, res?res[0]:{ timings: []});
		}));
	}));
}

function getPageMixStats(t, p, cb) {
	var query = queryfix(p.filter);
	if (!query._idp.$in) {
		query._idp={$in:[query._idp]};
	}
	var _arrApdex = [];
	var _arrProjectIds = [];
	safe.eachSeries(query._idp.$in, function(current_query, cb) {
		ctx.api.assets.getProjectApdexConfig(t, {
			_id: current_query
		}, function (err, apdex) {
			if (!err) {
				_arrApdex.push({AA:apdex._i_pagesT,AC:apdex._i_pagesT*4});
				_arrProjectIds.push(current_query);
			}
			cb();
		});
	}, safe.sure(cb, function() {
		var Q = parseInt(p.quant) || 1;
		var _dt0 = new Date(0);
		var facet_obj = {};
		var store_facet = {
			stats:[
				{$group: {_id: "$_s_route",
						c: {$sum: 1},
						tt: {$sum: "$_i_tt"},
						e: {$sum: {$multiply: [1.0, {$cond: {if: "$_i_err", then: 1, else: 0}}]}},
						ag: {$sum: {$cond: {if: "$_i_err", then: 0, else: {$cond: {if: {$lte: ["$_i_tt", "$ApdexT.AA"]}, then: 1, else: 0}}}}},
						aa: {$sum: {$cond: {if: "$_i_err", then: 0, else: {$cond: {if: {$and: [{$gt: ["$_i_tt", "$ApdexT.AA"]}, {$lte: ["$_i_tt", "$ApdexT.AC"]}]},	then: 1, else: 0}}}}}}
				},
				{$project: {value: {c: "$c",tt: "$tt",e: "$e",ag: "$ag",aa: "$aa",apdex: {$divide: [{$add: ["$ag", {$divide: ["$aa", 2]	}]}, "$c"]}}}},
				{$sort: {_id: 1}}
			],
			timings:[
				{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},
						c: {$sum: 1},
						r: {$sum: {$divide: [1, Q]}},
						tt: {$sum: "$_i_tt"},
						e: {$sum: {$divide: [{$cond: {if: "$_i_err",then: 1,else: 0}}, Q]}},
						ag: {$sum: {$cond: {if: "$_i_err", then: 0, else: {$cond: {if: {$lte: ["$_i_tt", "$ApdexT.AA"]}, then: 1, else: 0}}}}},
						aa: {$sum: {$cond: {if: "$_i_err", then: 0, else: {$cond: {if: {$and: [{$gt: ["$_i_tt", "$ApdexT.AA"]}, {$lte: ["$_i_tt", "$ApdexT.AC"]}]},then: 1, else: 0}}}}}}
				},
				{$project: {value: {c: "$c",r: "$r",tt: "$tt",e: "$e",ag: "$ag",aa: "$aa",apdex: {$divide: [{$add: ["$ag", {$divide: ["$aa", 2]}]}, "$c"]},	tta: {$divide: ["$tt", "$c"]}}}},
				{$sort: {_id: 1}}
			]
		};
		_.forEach(p.facet, function (n, key) {
			facet_obj[key]=store_facet[key];
		});
		if (!p.facet) {
			facet_obj = store_facet;
		}
		pages.aggregate([
			{ $match: query },
			{ $addFields: { "ApdexT": { $arrayElemAt: [_arrApdex, { $indexOfArray: [_arrProjectIds, "$_idp"] }] } } },
			{ $facet: facet_obj }
		],{allowDiskUse: true},safe.sure(cb,function (res) {
			 cb(null, res?res[0]:{ timings: []});
		}));
	}));
}

function getAjaxMixStats(t,p,cb) {
	var query = queryfix(p.filter);
	query = (p._idurl) ? _.assign(query, {
		_s_name: p._idurl
	}) : query;
	if (!query._idp.$in) {
		query._idp={$in:[query._idp]};
	}
	var _arrApdex = [];
	var _arrProjectIds = [];
	safe.eachSeries(query._idp.$in, function(current_query, cb) {
		ctx.api.assets.getProjectApdexConfig(t, {
			_id: current_query
		}, function (err, apdex) {
			if (!err) {
				_arrApdex.push({AA:apdex._i_ajaxT,AC:apdex._i_ajaxT*4});
				_arrProjectIds.push(current_query);
			}
			cb();
		});
	}, safe.sure(cb, function() {
		var Q = parseInt(p.quant) || 1;
		var _dt0 = new Date(0);
		var facet_obj={};
		var store_facet = {
			stats:[
				{$group: {_id: "$_s_name",
						c: {$sum: 1},
						tt: {$sum: "$_i_tt"},
						e: {$sum: {$multiply: [1.0, {$cond: {if: {$ne: ["$_i_code", 200]}, then: 1, else: 0}}]}},
						ag: {$sum: {$cond: {if: {$ne: ["$_i_code", 200]}, then: 0, else: {$cond: {if: {$lte: ["$_i_tt", "$ApdexT.AA"]}, then: 1, else: 0}}}}},
						aa: {$sum: {$cond: {if: {$ne: ["$_i_code", 200]}, then: 0, else: {$cond: {if: {$and: [{$gt: ["$_i_tt", "$ApdexT.AA"]}, {$lte: ["$_i_tt", "$ApdexT.AC"]}]},then: 1, else: 0}}}}}}
				},
				{$project: {value: {c: "$c", tt: "$tt", e: "$e",apdex: {$divide: [{$add: ["$ag", {$divide: ["$aa", 2]}]}, "$c"]}}}},
				{$sort: {_id: 1}}
			],
			timings:[
				{$group: {_id: {$trunc: {$divide: [{$subtract: ["$_dt", _dt0]}, {$multiply: [Q, 60000]}]}},
						c: {$sum: 1},
						r: {$sum: {$divide: [1, Q]}},
						tt: {$sum: "$_i_tt"},
						pt: {$sum: "$_i_pt"},
						code: {$first: "$_i_code"},
						e: {$sum: {$divide: [{$multiply: [1.0, {$cond: {if: {$ne: ["$_i_code", 200]}, then: 1, else: 0}}]}, Q]}},
						ag: {$sum: {$cond: {if: {$ne: ["$_i_code", 200]}, then: 0, else: {$cond: {if: {$lte: ["$_i_tt", "$ApdexT.AA"]}, then: 1, else: 0}}}}},
						aa: {$sum: {$cond: {if: {$ne: ["$_i_code", 200]}, then: 0, else: {$cond: {if: {$and: [{$gt: ["$_i_tt", "$ApdexT.AA"]}, {$lte: ["$_i_tt", "$ApdexT.AC"]}]},then: 1, else: 0}}}}}}
				},
				{$project: {value: {c: "$c",r: "$r",tt: "$tt",pt: "$pt",code: "$code",e: "$e",ag: "$ag",aa: "$aa",apdex: {$divide: [{$add: ["$ag", {$divide: ["$aa", 2]}]}, "$c"]},tta: {$divide: ["$tt", "$c"]}}}},
				{$sort: {_id: 1}}
			],
			breakdown:[
				{$group: {_id: "$_s_route", c: {$sum: 1}, tt: {$sum: "$_i_tt"}}},
				{$project: {value: {c: "$c", tt: "$tt"}}}
			]
		};
		_.forEach(p.facet, function (n, key) {
			facet_obj[key]=store_facet[key];
		});
		if (!p.facet) {
			facet_obj = store_facet;
		}
		ajax.aggregate([
			{$match: query},
			{ $addFields: { "ApdexT": { $arrayElemAt: [_arrApdex, { $indexOfArray: [_arrProjectIds, "$_idp"] }] } } },
			{$facet: facet_obj}
		],{allowDiskUse: true},safe.sure(cb,function (res) {
			 cb(null, res?res[0]:{ timings: []});
		}));
	}));
}

}));
}));
};
