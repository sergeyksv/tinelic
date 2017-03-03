/*jslint node: true */
/*global emit, Q, AG, AA, CAT, QUANT, NAME, ALL */
"use strict";
var _ = require("lodash");
var async = require("async");
var safe = require("safe");
var mongo = require("mongodb");
var moment = require("moment");
var request = require('request');
var CustomError = require('tinyback').CustomError;

module.exports.deps = ['mongo','prefixify','validate'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
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
				serverErrors.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
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
				serverErrors.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
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
				events.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
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
				events.aggregate([{$match:q},{$group:{_id:"$ehash"}}], safe.sure(cb, function (res) {
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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		metrics.mapReduce(
			function() {
				emit(this._s_pid, {mem: this._f_val, c:this._i_cnt});
			},
			function(k,v) {
				var r = null;
				v.forEach(function(v) {
					if (!r)
						r = v;
					else {
						r.mem += v.mem;
						r.c += v.c;
					}
				});
				return r;
			},
			{
				query: query,
				out:{inline: 1}
			},
			safe.sure(cb, function(data) {
				var memtt = 0;
				_.forEach(data,function(r) {
					memtt += r.value.mem/r.value.c;
				});
				cb(null,{proc: data.length, mem: Math.round(memtt)});
			})
		);
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		metrics.aggregate([
			{$match: query},
			{$group: {_id: "$_s_pid",  mem1: {$sum: "$_f_val"}, c1: {$sum: "$_i_cnt"} }},
		],
		safe.sure(cb, function(res) {
				var memtt = 0;
				_.forEach(res,function(r) {
					memtt += r.mem1/r.c1;
				});
				cb(null,{proc: res.length, mem: Math.round(memtt)});
			})
		);////////////end of aggregate
	}));
},],
////////////////////
///////////the choice of grouping
////////////////////
function(err,res){
//console.log("getMetricTotals: ", res);
cb(null, res[1]);});
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{apdex:number,tta:number,c:number,r:number,tt:number}}>}
*/
getActionTimings: function(t, p, cb) {
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
			var ApdexT = apdex._i_serverT;
			actions.mapReduce(
				function() {
					emit(parseInt(this._dt.valueOf()/(Q*60000)), {
						c:1,
						r: 1.0/Q,
						e: (this._i_err?1:0)/Q,
						tt: this._i_tt,
						ag: (this._i_err)?0:((this._i_tt <= AG) ? 1 : 0),
						aa: (this._i_err)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)
					});
				},
				function (k,v) {
					var r=null;
					v.forEach(function (v) {
						if (!r) {
							r = v;
						}
						else {
							r.tt+=v.tt;
							r.r+=v.r;
							r.e+=v.e;
							r.c+=v.c;
							r.ag+=v.ag;
							r.aa+=v.aa;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {Q: p.quant || 1 , AG:ApdexT, AA:ApdexT*4}
				}, safe.sure(cb, function (data) {
					_.each(data, function (metric) {
						var key = metric.value;
						key.apdex = (key.ag+key.aa/2)/key.c;
						key.tta = key.tt/key.c;
					});
					cb(null, data);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    checkAccess(t, query, safe.sure(cb, function() {
        ctx.api.assets.getProjectApdexConfig(t, {
            _id: query._idp
        }, safe.sure(cb, function(apdex) {
            var ApdexT = apdex._i_serverT;
            var Q = p.quant || 1;
            var AG = ApdexT;
            var AA = ApdexT * 4;
            var _dt0 = new Date(0);
            actions.aggregate([{
                    $match: query
                },
                {
                    $group: {
                        _id: {
                            $trunc: {
                                $divide: [{
                                    $subtract: ["$_dt", _dt0]
                                }, {
                                    $multiply: [Q, 60000]
                                }]
                            }
                        },
                        c: {
                            $sum: 1
                        },
                        r: {
                            $sum: {
                                $divide: [1, Q]
                            }
                        },
                        e: {
                            $sum: {
                                $divide: [{
                                    $cond: {
                                        if: "$_i_err",
                                        then: 1,
                                        else: 0
                                    }
                                }, Q]
                            }
                        },
                        tt: {
                            $sum: "$_i_tt"
                        },
                        ag: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $lte: ["$_i_tt", AG]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        aa: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $and: [{
                                                    $gt: ["$_i_tt", AG]
                                                }, {
                                                    $lte: ["$_i_tt", AA]
                                                }]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        value: {
                            c: "$c",r: "$r",e: "$e",tt: "$tt",ag: "$ag",aa: "$aa",
                            apdex: {
                                $divide: [{
                                    $add: ["$ag", {
                                        $divide: ["$aa", 2]
                                    }]
                                }, "$c"]
                            },
                            tta: {
                                $divide: ["$tt", "$c"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ], cb);
        }))
    }))
}
,],
function(err,res){
//console.log("mapReduce",JSON.stringify(_.sortBy(res[0],"_id")));
//console.log("==========================");
//console.log("aggregate",JSON.stringify(_.sortBy(res[1],"_id")));

//console.log(res[0].length, res[1].length);
//console.log("===========================");
//console.log(res[0]);
//console.log("============================================================================================");
//console.log(res[1]);
//console.log(_.isEqual(JSON.stringify(_.sortBy(tmpRes0),"_id"), JSON.stringify(_.sortBy(tmpRes1,"_id"))));
//console.log(res[1]);
cb(null, res[1]);
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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb, function(apdex){
			var ApdexT = apdex._i_serverT;
			actions.mapReduce(
				function() {
					emit(this._s_name, {c:1, tt: this._i_tt,
						ag:(this._i_err)?0:((this._i_tt <= AG) ? 1 : 0),
						aa: (this._i_err)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)
					});
				},
				function (k,v) {
					var r=null;
					v.forEach(function (v) {
						if (!r)
							r = v;
						else {
							r.tt+=v.tt;
							r.c+=v.c;
							r.ag+=v.ag;
							r.aa+=v.aa;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {AG:ApdexT, AA:ApdexT*4}
				},
				safe.sure(cb, function(data) {
					_.each(data, function (metric) {
						var key = metric.value;
						key.apdex = (key.ag+key.aa/2)/key.c;
						delete key.ag; delete key.aa;
					});
					cb(null, data);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    checkAccess(t, query, safe.sure(cb, function() {
        ctx.api.assets.getProjectApdexConfig(t, {
            _id: query._idp
        }, safe.sure(cb, function(apdex) {
            var ApdexT = apdex._i_serverT;
            actions.aggregate([{
                    $match: query
                },
                {
                    $group: {
                        _id: "$_s_name",
                        c: {
                            $sum: 1
                        },
                        tt: {
                            $sum: "$_i_tt"
                        },
                        ag: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $lte: ["$_i_tt", ApdexT]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        aa: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $and: [{
                                                    $gt: ["$_i_tt", ApdexT]
                                                }, {
                                                    $lte: ["$_i_tt", {
                                                        $multiply: [ApdexT, 4]
                                                    }]
                                                }]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        value: {
                            c: "$c",
                            tt: "$tt",
                            apdex: {
                                $divide: [{
                                    $add: ["$ag", {
                                        $divide: ["$aa", 2]
                                    }]
                                }, "$c"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ], cb);
        }))
    }))
}
,],
function(err,res){
//console.log("mapReduce:", JSON.stringify(res[0]));
//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
//console.log("aggregate:", JSON.stringify(res[1]));
//console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
});
},

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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
			var ApdexT = apdex._i_ajaxT;
			ajax.mapReduce(
				function() {
					emit(this._s_name, {c:1, tt: this._i_tt, e:1.0*(this._i_code != 200 ? 1:0 ),
						ag:(this._i_code != 200)?0:((this._i_tt <= AG) ? 1 : 0),
						aa:(this._i_code != 200)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)});
				},
				function (k,v) {
					var r=null;
					v.forEach(function (v) {
						if (!r)
							r = v;
						else {
							r.tt += v.tt;
							r.c+=v.c;
							r.e+=v.e;
							r.ag+=v.ag;
							r.aa+=v.aa;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: { AG:ApdexT, AA:ApdexT*4}
				},safe.sure(cb, function (data) {
					_.each(data, function (metric) {
						var key = metric.value;
						key.apdex = (key.ag+key.aa/2)/key.c;
						delete key.ag; delete key.aa;
					});
					cb(null, data);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    checkAccess(t, query, safe.sure(cb, function() {
        ctx.api.assets.getProjectApdexConfig(t, {
            _id: query._idp
        }, safe.sure(cb, function(apdex) {
            var ApdexT = apdex._i_ajaxT;
            ajax.aggregate([{
                    $match: query
                },
                {
                    $group: {
                        _id: "$_s_name",
                        c: {
                            $sum: 1
                        },
                        tt: {
                            $sum: "$_i_tt"
                        },
                        e: {
                            $sum: {
                                $multiply: [1.0, {
                                    $cond: {
                                        if: {
                                            $ne: ["$_i_code", 200]
                                        },
                                        then: 1,
                                        else: 0
                                    }
                                }]
                            }
                        },
                        ag: {
                            $sum: {
                                $cond: {
                                    if: {
                                        $ne: ["$_i_code", 200]
                                    },
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $lte: ["$_i_tt", ApdexT]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        aa: {
                            $sum: {
                                $cond: {
                                    if: {
                                        $ne: ["$_i_code", 200]
                                    },
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $and: [{
                                                    $gt: ["$_i_tt", ApdexT]
                                                }, {
                                                    $lte: ["$_i_tt", {
                                                        $multiply: [ApdexT, 4]
                                                    }]
                                                }]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        value: {
                            c: "$c",
                            tt: "$tt",
                            e: "$e",
                            apdex: {
                                $divide: [{
                                    $add: ["$ag", {
                                        $divide: ["$aa", 2]
                                    }]
                                }, "$c"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ], cb);
        }))
    }))
}
,],
function(err,res){
//console.log("mapReduce:", JSON.stringify(res[0]));
//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
//console.log("aggregate:", JSON.stringify(res[1]));
//console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
});
},

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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
			var ApdexT = apdex._i_pagesT;
			pages.mapReduce(
				function() {
					emit(this._s_route, {c:1, tt: this._i_tt, e:1.0*(this._i_err?1:0),
						ag:(this._i_err)?0:((this._i_tt <= AG) ? 1 : 0),
						aa:(this._i_err)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)});
				},
				function (k,v) {
					var r=null;
					v.forEach(function (v) {
						if (!r) {
							r = v;
						}
						else {
							r.tt+=v.tt;
							r.c+=v.c;
							r.e+=v.e;
							r.ag+=v.ag;
							r.aa+=v.aa;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {AG:ApdexT, AA:ApdexT*4}
				}, safe.sure(cb, function (data) {
					_.each(data, function (metric) {
						var key = metric.value;
						key.apdex = (key.ag+key.aa/2)/key.c;
						//delete key.ag; delete key.aa;
					});
					cb(null, data);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    checkAccess(t, query, safe.sure(cb, function() {
        ctx.api.assets.getProjectApdexConfig(t, {
            _id: query._idp
        }, safe.sure(cb, function(apdex) {
            var ApdexT = apdex._i_pagesT;
            pages.aggregate([{
                    $match: query
                },
                {
                    $group: {
                        _id: "$_s_route",
                        c: {
                            $sum: 1
                        },
                        tt: {
                            $sum: "$_i_tt"
                        },
                        e: {
                            $sum: {
                                $multiply: [1.0, {
                                    $cond: {
                                        if: "$_i_err",
                                        then: 1,
                                        else: 0
                                    }
                                }]
                            }
                        },
                        ag: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $lte: ["$_i_tt", ApdexT]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        aa: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $and: [{
                                                    $gt: ["$_i_tt", ApdexT]
                                                }, {
                                                    $lte: ["$_i_tt", {
                                                        $multiply: [ApdexT, 4]
                                                    }]
                                                }]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        value: {
                            c: "$c",tt: "$tt",e: "$e",ag: "$ag",aa: "$aa",
                            apdex: {
                                $divide: [{
                                    $add: ["$ag", {
                                        $divide: ["$aa", 2]
                                    }]
                                }, "$c"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ], cb);
        }))
    }))
}
,],
function(err,res){
//console.log("mapReduce:", JSON.stringify(res[0]));
//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
//console.log("aggregate:", JSON.stringify(res[1]));
//console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		serverErrors.findOne({_id:query._id}, safe.sure(cb, function (err) {
			if (!err)
				cb(new CustomError("No event found", "Not Found"));
			query.ehash = err.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			serverErrors.mapReduce(function () {
					var route = {};
					if (this.action){
						route[this.action._s_name]=1;
					}
					var reporter = {}; reporter[this._s_reporter]=1;
					var server = {}; server[this._s_server]=1;
					var lang = {}; lang[this._s_logger]=1;
					emit(ALL?this._idp:this.ehash,{c:1,route:route,reporter:reporter,server:server,lang:lang});
				},
				function (k, v) {
					var r=null;
					v.forEach(function (v) {
						var k;
						if (!r)
							r = v;
						else {
							r.c+=v.c;
							for (k in v.route) {
								r.route[k]=(r.route[k] || 0) + v.route[k];
							}
							for (k in v.reporter) {
								r.reporter[k]=(r.reporter[k] || 0) + v.reporter[k];
							}
							for (k in v.server) {
								r.server[k]=(r.server[k] || 0) + v.server[k];
							}
							for (k in v.lang) {
								r.lang[k]=(r.lang[k] || 0) + v.lang[k];
							}
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {ALL:query.ehash?0:1}
				},
				safe.sure(cb, function (stats) {
					var res = stats[0].value;
					var res1 = {route:[],server:[],reporter:[],lang:[], count:res.c};
					_.each(res.route, function (v,k) {
						res1.route.push({k:k,v:v});
					});
					_.each(res.server, function (v,k) {
						res1.server.push({k:k,v:v});
					});
					_.each(res.reporter, function (v,k) {
						res1.reporter.push({k:k,v:v});
					});
					_.each(res.lang, function (v,k) {
						res1.lang.push({k:k,v:v});
					});
					cb(null,res1);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb){
	var query = queryfix(p.filter);var ALL = query.ehash?0:1;
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		serverErrors.findOne({_id:query._id}, safe.sure(cb, function (err) {
			if (!err)
				cb(new CustomError("No event found", "Not Found"));
			query.ehash = err.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			serverErrors.aggregate([{
			        $match: query
			    },
			    {
			        $facet: {
			            _id: [{
			                $group: {
			                    _id: {
			                        $cond: {
			                            if: ALL,
			                            then: "$_idp",
			                            else: "$ehash"
			                        }
			                    },
			                    c: {
			                        $sum: 1
			                    }
			                }
			            }, {
			                $sort: {
			                    _id: 1
			                }
			            }],
			            route: [{
			                $group: {
			                    _id: "$action._s_name",
			                    c: {
			                        $sum: 1
			                    }
			                }
			            }, {
			                $sort: {
			                    _id: 1
			                }
			            }],
			            reporter: [{
			                $group: {
			                    _id: "$_s_reporter",
			                    c: {
			                        $sum: 1
			                    }
			                }
			            }],
			            server: [{
			                $group: {
			                    _id: "$_s_server",
			                    c: {
			                        $sum: 1
			                    }
			                }
			            }, {
			                $sort: {
			                    _id: 1
			                }
			            }],
			            lang: [{
			                $group: {
			                    _id: "$_s_logger",
			                    c: {
			                        $sum: 1
			                    }
			                }
			            }, {
			                $sort: {
			                    _id: 1
			                }
			            }]
			        }
			    }
			], safe.sure(cb, function(tmpData) {
			    var tmp_id = tmpData[0]._id[0];
			    var tmpRoute = tmpData[0].route;
			    var tmpReporter = tmpData[0].reporter;
			    var tmpServer = tmpData[0].server;
			    var tmpLang = tmpData[0].lang;
			    var res = {route: [],server: [],reporter: [],lang: [],count: tmp_id.c};
			    _.each(tmpRoute, function(v, k) {
			        if (v._id != null) {
			            res.route.push({
			                k: v._id,
			                v: v.c
			            });
			        };
			    });
			    _.each(tmpReporter, function(v, k) {
			        res.reporter[k] = {
			            "k": v._id,
			            "v": v.c
			        };
			    });
			    _.each(tmpServer, function(v, k) {
			        res.server[k] = {
			            "k": v._id,
			            "v": v.c
			        };
			    });
			    _.each(tmpLang, function(v, k) {
			        res.lang[k] = {
			            "k": v._id,
			            "v": v.c
			        };
			    });
			    cb(null, res);
			}));
		}));
	}));
},],
function(err,res){
//console.log("MR1:", _.sortBy(res[0].route, "k"));
//console.log("ag1:", _.sortBy(res[1].route, "k"));
//console.log("route:",_.isEqual(_.sortBy(res[0].route,"k"), _.sortBy(res[1].route,"k")));
cb(null, res[1]);
});
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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	query =(p._idurl)? _.extend(query,{_s_name:p._idurl}): query;
	checkAccess(t, query, safe.sure(cb, function () {
		ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
			var ApdexT = apdex._i_ajaxT;
			ajax.mapReduce(
				function() {
					emit(parseInt(this._dt.valueOf()/(Q*60000)), {c:1, r: 1.0/Q, tt: this._i_tt, pt: this._i_pt, code: this._i_code,
						e:1.0*(this._i_code != 200 ? 1:0 )/Q,
						ag:(this._i_code != 200)?0:((this._i_tt <= AG) ? 1 : 0),
						aa:(this._i_code != 200)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)});
				},
				function (k,v) {
					var r=null;
					v.forEach(function (v) {
						if (!r)
							r = v;
						else {
							r.tt+=v.tt; r.r+=v.r; r.c+=v.c; r.ag+=v.ag; r.aa+=v.aa; r.e+=v.e; r.pt+= v.pt;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
				},safe.sure(cb, function (data) {
					_.each(data, function (metric) {
						var key = metric.value;
						key.apdex = (key.ag+key.aa/2)/key.c;
						key.tta = key.tt/key.c;
					});
					cb(null, data);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    query = (p._idurl) ? _.extend(query, {
        _s_name: p._idurl
    }) : query;
    checkAccess(t, query, safe.sure(cb, function() {
        ctx.api.assets.getProjectApdexConfig(t, {
            _id: query._idp
        }, safe.sure(cb, function(apdex) {
            var ApdexT = apdex._i_ajaxT;
            var Q = p.quant || 1;
            var _dt0 = new Date(0);
            ajax.aggregate([{
                    $match: query
                },
                {
                    $group: {
                        _id: {
                            $trunc: {
                                $divide: [{
                                    $subtract: ["$_dt", _dt0]
                                }, {
                                    $multiply: [Q, 60000]
                                }]
                            }
                        },
                        c: {
                            $sum: 1
                        },
                        r: {
                            $sum: {
                                $divide: [1, Q]
                            }
                        },
                        tt: {
                            $sum: "$_i_tt"
                        },
                        pt: {
                            $sum: "$_i_pt"
                        },
                        code: {
                            $first: "$_i_code"
                        },
                        e: {
                            $sum: {
                                $divide: [{
                                    $multiply: [1.0, {
                                        $cond: {
                                            if: {
                                                $ne: ["$_i_code", 200]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }]
                                }, Q]
                            }
                        },
                        ag: {
                            $sum: {
                                $cond: {
                                    if: {
                                        $ne: ["$_i_code", 200]
                                    },
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $lte: ["$_i_tt", ApdexT]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        aa: {
                            $sum: {
                                $cond: {
                                    if: {
                                        $ne: ["$_i_code", 200]
                                    },
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $and: [{
                                                    $gt: ["$_i_tt", ApdexT]
                                                }, {
                                                    $lte: ["$_i_tt", {
                                                        $multiply: [ApdexT, 4]
                                                    }]
                                                }]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        value: {
                            c: "$c",r: "$r",tt: "$tt",pt: "$pt",code: "$code",e: "$e",ag: "$ag",aa: "$aa",
                            apdex: {
                                $divide: [{
                                    $add: ["$ag", {
                                        $divide: ["$aa", 2]
                                    }]
                                }, "$c"]
                            },
                            tta: {
                                $divide: ["$tt", "$c"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ], cb);
        }))
    }))
}
,],
function(err,res){
//_.forEach(res[0], function(data){data.value.r = Math.round(data.value.r*100)/100});
//_.forEach(res[1], function(data){data.value.r = Math.round(data.value.r*100)/100});
// console.log("mapReduce:", JSON.stringify(res[0]));
// console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
// console.log("aggregate:", JSON.stringify(res[1]));
// console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ctx.api.assets.getProjectApdexConfig(t,{_id:query._idp},safe.sure(cb,function(apdex){
			var ApdexT = apdex._i_pagesT;
			pages.mapReduce(function () {
					emit(parseInt(this._dt.valueOf()/(Q*60000)), {c:1, r: 1.0/Q, tt: this._i_tt, e:1.0*(this._i_err?1:0)/Q,
						ag:(this._i_err)?0:((this._i_tt <= AG) ? 1 : 0),
						aa:(this._i_err)?0:((this._i_tt > AG && this._i_tt <= AA) ? 1 : 0)});
				},
				function (k, v) {
					var r=null;
					v.forEach(function (v) {
						if (!r)
							r = v;
						else {
							r.tt+=v.tt;r.r+=v.r;r.c+=v.c;r.ag+=v.ag;r.aa+=v.aa;r.e+=v.e;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {Q: p.quant || 1, AG:ApdexT, AA:ApdexT*4}
				}, safe.sure(cb, function (data) {
					_.each(data, function (metric) {
						var key = metric.value;
						key.apdex = (key.ag+key.aa/2)/key.c;
						key.tta = key.tt/key.c;
					});
					cb(null, data);
				})
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    checkAccess(t, query, safe.sure(cb, function() {
        ctx.api.assets.getProjectApdexConfig(t, {
            _id: query._idp
        }, safe.sure(cb, function(apdex) {
            var ApdexT = apdex._i_pagesT;
            var Q = p.quant || 1;
            var _dt0 = new Date(0);
            pages.aggregate([{
                    $match: query
                },
                {
                    $group: {
                        _id: {
                            $trunc: {
                                $divide: [{
                                    $subtract: ["$_dt", _dt0]
                                }, {
                                    $multiply: [Q, 60000]
                                }]
                            }
                        },
                        c: {
                            $sum: 1
                        },
                        r: {
                            $sum: {
                                $divide: [1, Q]
                            }
                        },
                        tt: {
                            $sum: "$_i_tt"
                        },
                        e: {
                            $sum: {
                                $divide: [{
                                    $cond: {
                                        if: "$_i_err",
                                        then: 1,
                                        else: 0
                                    }
                                }, Q]
                            }
                        },
                        ag: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $lte: ["$_i_tt", ApdexT]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        aa: {
                            $sum: {
                                $cond: {
                                    if: "$_i_err",
                                    then: 0,
                                    else: {
                                        $cond: {
                                            if: {
                                                $and: [{
                                                    $gt: ["$_i_tt", ApdexT]
                                                }, {
                                                    $lte: ["$_i_tt", {
                                                        $multiply: [ApdexT, 4]
                                                    }]
                                                }]
                                            },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        value: {
                            c: "$c",r: "$r",tt: "$tt",e: "$e",ag: "$ag",aa: "$aa",
                            apdex: {
                                $divide: [{
                                    $add: ["$ag", {
                                        $divide: ["$aa", 2]
                                    }]
                                }, "$c"]
                            },
                            tta: {
                                $divide: ["$tt", "$c"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ], cb);
        }))
    }))
}
,],
function(err,res){
//_.forEach(res[0], function(data){data.value.r = Math.round(data.value.r*100)/100; data.value.e = Math.round(data.value.e*100)/100});
//_.forEach(res[1], function(data){data.value.r = Math.round(data.value.r*100)/100; data.value.e = Math.round(data.value.e*100)/100});
// console.log("mapReduce:", JSON.stringify(res[0]));
// console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
// console.log("aggregate:", JSON.stringify(res[1]));
// console.log("length:", res[0].length, res[1].length);
// console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
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
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (project and ehash)
		events.findOne({_id:query._id}, safe.sure(cb, function (event) {
			if (!event)
				cb(new CustomError("No event found", "Not Found"));
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			events.mapReduce(function () {
				var route = {}; route[this.request._s_route]=1;
				var browser = {}; browser[this.agent.family+" "+this.agent.major]=1;
				var os = {}; os[this.agent.os.family]=1;
				var sessions = {}; sessions[this.shash]=1;
				var views = {}; views[this._idpv]=1;
				emit(ALL?this._idp:this.ehash,{c:1,route:route,browser:browser,os:os,sessions:sessions,views:views});
			},
			function (k, v) {
				var r=null;
				v.forEach(function (v) {
					var k;
					if (!r)
						r = v;
					else {
						for (k in v.sessions) {
							r.sessions[k]=1;
						}
						for (k in v.views) {
							r.views[k]=1;
						}
						r.c+=v.c;
						for (k in v.route) {
							r.route[k]=(r.route[k] || 0) + v.route[k];
						}
						for (k in v.browser) {
							r.browser[k]=(r.browser[k] || 0) + v.browser[k];
						}
						for (k in v.os) {
							r.os[k]=(r.os[k] || 0) + v.os[k];
						}
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1},
				scope: {ALL:query.ehash?0:1}
			},
			safe.sure(cb, function (stats) {
				var res1 = {route:[],os:[],browser:[],count:0,sessions:0,views:0};
				if (stats.length) {
					var res = stats[0].value;
					res1.count = res.c;
					res1.sessions = _.size(res.sessions);
					res1.views = _.size(res.views);
					_.each(res.route, function (v,k) {
						res1.route.push({k:k,v:v});
					});
					_.each(res.os, function (v,k) {
						res1.os.push({k:k,v:v});
					});
					_.each(res.browser, function (v,k) {
						res1.browser.push({k:k,v:v});
					});
				}
				cb(null,res1);
			}));
		}));
	}));
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
				cb(new CustomError("No event found", "Not Found"));
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			events.mapReduce(function () {
				var s = {}; s[this.shash]=1;
				var epm = {}; epm[this._idpv]=1;
				emit(this.ehash,{count:1,session:s,_dtmax:this._dt.valueOf(),_dtmin:this._dt.valueOf(), _id:this._id,pages:epm});
			},
			function (k, v) {
				var r=null;
				v.forEach(function (v) {
					var k;
					if (!r)
						r = v;
					else {
						for (k in v.session) {
							r.session[k]=1;
						}
						for (k in v.pages) {
							r.pages[k]=1;
						}
						r.count+=v.count;
						r._dtmin = Math.min(r._dtmin, v._dtmin);
						r._dtmax = Math.max(r._dtmax, v._dtmax);
						if (r._dtmax==v._dtmax)
							r._id = v._id;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1}
			},
			safe.sure(cb, function (stats) {
				_.each(stats, function (s) {
					s.value.session = _.size(s.value.session);
					s.value.pages = _.size(s.value.pages);
				} );
				var ids = {};
				_.each(stats, function (s) {
					ids[s.value._id]={stats:s.value};
				} );
				events.find(queryfix({_id:{$in:_.keys(ids)}}))
					.toArray(safe.sure(cb, function (errors) {
						_.each(errors, function (e) {
							ids[e._id].error = e;
						});
						var data = _.values(ids);
						cb(null, data);
					}));
			}));
		}));
	}));
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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		events.findOne({_id:query._id}, safe.sure(cb, function (event) {
			if (!event)
				cb(new CustomError("No event found", "Not Found"));
			query._idp = event._idp;
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			events.mapReduce(
				function() {
					emit(parseInt(this._dt.valueOf()/(Q*60000)), { r:1.0/Q, _dt:this._dt});
				},
				function (k,v) {
					var r=null;
					v.forEach(function (v) {
						if (!r){
							r = v;
						}
						else {
							r.r+=v.r;
						}
					});
					return r;
				},
				{
					query: query,
					out: {inline:1},
					scope: {Q:p.quant || 1}
				},
				cb
			);
		}));
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb){
	var query = queryfix(p.filter);
	safe.run(function (cb) {
		// to identify error type we can provide id of existing error
		if (!query._id)
			// overwise we assume that called knows what to do
			return cb();
		// then we need to fetch it and grap required info (projec and ehash)
		events.findOne({_id:query._id}, safe.sure(cb, function (event) {
			if (!event)
				cb(new CustomError("No event found", "Not Found"));
			query._idp = event._idp;
			query.ehash = event.ehash;
			delete query._id;
			cb();
		}));
	},safe.sure(cb, function () {
		checkAccess(t, query, safe.sure(cb, function () {
			var Q = p.quant || 1; var _dt0 = new Date(0);
			events.aggregate([{
			        $match: query
			    },
			    {
			        $group: {
			            _id: {
			                $trunc: {
			                    $divide: [{
			                        $subtract: ["$_dt", _dt0]
			                    }, {
			                        $multiply: [Q, 60000]
			                    }]
			                }
			            },
			            r: {
			                $sum: {
			                    $divide: [1, Q]
			                }
			            },
			            _dt: {
			                $first: "$_dt"
			            }
			        }
			    },
			    {
			        $project: {
			            value: {
			                r: "$r",_dt: "$_dt"
			            }
			        }
			    },
			    {
			        $sort: {
			            _id: 1
			        }
			    }
			], cb);
}))}))
},],
function(err,res){
/*_.forEach(res[0], function(data){data.value.r = Math.round(data.value.r*100)/100});
_.forEach(res[1], function(data){data.value.r = Math.round(data.value.r*100)/100});
console.log("mapReduce:", JSON.stringify(res[0]));
console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
console.log("aggregate:", JSON.stringify(res[1]));
console.log("length:", res[0].length, res[1].length);
console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
*/
cb(null, res[1]);
});
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{r:number}}>}
*/
getActionErrorTimings:function(t, p, cb) {
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query1 = queryfix(p.filter);
	var q = p.quant || 1;
	serverErrors.findOne(query1, safe.sure(cb, function (event) {
		if (event) {
			var query =(query1._id)? {_idp:event._idp, _s_message:event._s_message,_dt:query1._dt}: query1;
			checkAccess(t, query, safe.sure(cb, function () {
				serverErrors.mapReduce(
					function() {
						emit(parseInt(this._dt.valueOf()/(Q*60000)), { r:1.0/Q});
					},
					function (k,v) {
						var r=null;
						v.forEach(function (v) {
							if (!r)
								r = v;
							else
								r.r+=v.r;
						});
						return r;
					},
					{
						query: query,
						out: {inline:1},
						scope: {Q:q}
					},
					cb
				);
			}));
		}
		else
			cb();
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query1 = queryfix(p.filter);
    var Q = p.quant || 1;
    serverErrors.findOne(query1, safe.sure(cb, function(event) {
        if (event) {
            var query = (query1._id) ? {
                _idp: event._idp,
                _s_message: event._s_message,
                _dt: query1._dt
            } : query1;
            checkAccess(t, query, safe.sure(cb, function() {
                var _dt0 = new Date(0);
                serverErrors.aggregate([{
                        $match: query
                    },
                    {
                        $group: {
                            _id: {
                                $trunc: {
                                    $divide: [{
                                        $subtract: ["$_dt", _dt0]
                                    }, {
                                        $multiply: [Q, 60000]
                                    }]
                                }
                            },
                            r: {
                                $sum: {
                                    $divide: [1, Q]
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            value: {
                                r: "$r"
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    }
                ], cb);
            }))
        }
    }))
}
,],
function(err,res){
//_.forEach(res[0], function(data){data.value.r = Math.round(data.value.r*100)/100});
//_.forEach(res[1], function(data){data.value.r = Math.round(data.value.r*100)/100});
//console.log("mapReduce:", JSON.stringify(res[0]));
//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
//console.log("aggregate:", JSON.stringify(res[1]));
//console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
});
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
		serverErrors.mapReduce(function () {
			emit(this.ehash,{c:1,_dtmax:this._dt.valueOf(),_dtmin:this._dt.valueOf(), _id:this._id});
		},
		function (k, v) {
			var r=null;
			v.forEach(function (v) {
				if (!r)
					r = v;
				else {
					r.c+=v.c;
					r._dtmin = Math.min(r._dtmin, v._dtmin);
					r._dtmax = Math.max(r._dtmax, v._dtmax);
					if (r._dtmax==v._dtmax)
						r._id = v._id;
				}
			});
			return r;
		},
		{
			query: query,
			out: {inline:1}
		},
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
		as.mapReduce(
			function() {
				this.data.forEach(function(k,v) {
					emit(k._s_name, {c: k._i_cnt, tt: k._i_tt, ot: k._i_own});
				});
			},
			function (k,v) {
				var r=null;
				v.forEach(function(v) {
					if (!r)
						r = v;
					else {
						r.tt += v.tt;
						r.c += v.c;
						r.ot += v.ot;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1}
			}, cb
		);
	}));
},

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
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		as.mapReduce(
			function() {
				this.data.forEach(function(k) {
					if (k._s_cat == CAT) {
						emit(k._s_name, {tt: k._i_tt, c: k._i_cnt});
					}
				});
			},
			function (k,v) {
				var r = null;
				v.forEach(function(v) {
					if (!r)
						r = v;
					else {
						r.tt += v.tt;
						r.c += v.c;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1},
				scope: {CAT: query['data._s_cat']}
			},
			cb
		);
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb){

cb();
},],
function(err,res){
//_.forEach(res[0], function(data){data.value.r = Math.round(data.value.r*100)/100});
//_.forEach(res[1], function(data){data.value.r = Math.round(data.value.r*100)/100});
//console.log("mapReduce:", JSON.stringify(res[0]));
//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
//console.log("aggregate:", JSON.stringify(res[1]));
//console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[0]);
});
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
		ajax.mapReduce(
			function() {
				emit(this._s_name, {c:1, tt: this._i_tt});
			},
			function (k,v) {
				var r=null;
				v.forEach(function (v) {
					if (!r)
						r = v;
					else {
						r.tt+=v.tt;
						r.c+=v.c;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1},
				scope: {}
			}, cb
		);
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._s_name Ajax name
* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
*/
getAjaxBreakdown: function(t,p,cb){
async.series([
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ajax.mapReduce(
			function() {
				if (this._s_route)
					emit(this._s_route, {c:1, tt: this._i_tt} );
			},
			function (k,v) {
				var r=null;
				v.forEach(function (v) {
					if (!r)
						r = v;
					else {
						r.tt+=v.tt;
						r.c+=v.c;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1}
			}, cb
		);
	}));
},
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		ajax.aggregate([
			{$match: query},
			{$group: {_id: "$_s_route", c: {$sum: 1}, tt: {$sum: "$_i_tt"}}},
			{$project: {value: {c: "$c", tt: "$tt"}}}
			//{$sort: {_id:1}}
		], safe.sure(cb, function(r){
				    var r1=_.filter(r,"_id");
				    cb(null,r1)
				}));
	}));
},],
function(err,res){
//console.log("mapReduce",JSON.stringify(res[0]));
//console.log("==========================");
//console.log("aggregate",JSON.stringify(res[1]));

//console.log("==========================");
//console.log(res[0].length, res[1].length);

//console.log("==========================");
//console.log(_.isEqual(_.sortBy(res[0],"_id"),_.sortBy(res[1],"_id")));
cb(null,res[1]);
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
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		var name = query["data._s_name"];
		as.mapReduce(function () {
				var dt = parseInt(this._dt.valueOf()/(Q*60000));
				this.data.forEach(function(k) {
					if (CAT==k._s_cat && (!NAME || k._s_name == NAME)) {
						emit(dt,{c: k._i_cnt, r: k._i_cnt/Q, tt: k._i_tt});
					}
				});
			},
			function (k, v) {
				var r=null;
				v.forEach(function (v) {
					if (!r) {
						r = v;
					}
					else {
						r.c += v.c;
						r.r += v.r;
						r.tt += v.tt;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1},
				scope: {NAME: name, Q: p.quant || 1, CAT: query['data._s_cat']}
			}, safe.sure(cb, function (data) {
				_.each(data, function (metric) {
					var key = metric.value;
					key.tta = key.tt/key.c;
				});
				cb(null, data);
			})
		);
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @param {String} filter._s_name Ajax name
* @return {Array<{_id:{string},value:{c:number,tt: number}}>}
*/
getActionSegmentBreakdown: function(t,p, cb) {
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		as.mapReduce(
			function() {
				var self=this;
				this.data.forEach(function(k,v) {
					if (k._s_name == NAME) {
						emit(self._s_name, {c: k._i_cnt, tt: k._i_tt});
					}
				});
			},
			function (k,v) {
				var r=null;
				v.forEach(function(v) {
					if (!r)
						r = v;
					else {
						r.tt += v.tt;
						r.c += v.c;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1},
				scope: {CAT: query._s_cat, NAME: p.filter["data._s_name"]}
			}, cb
		);
	}));
},

/**
* @param {String} token Auth token
* @param {Integer} quant Amount of minutes in time slot
* @param {Object} filter Filter for actions
* @param {String} filter._idp Project id
* @return {Array<{_id:{module:StatsApi~TimeSlot},value:{c: number, mem: number, mema: number}}>}
*/
getMetricTimings:function(t,p,cb) {
async.series([
////////////////////
///////////mapReduce
////////////////////
function(cb){
	var query = queryfix(p.filter);
	checkAccess(t, query, safe.sure(cb, function () {
		metrics.mapReduce(
			function(){
				emit(parseInt(this._dt.valueOf()/(Q*60000)),{mem: this._f_val, c: this._i_cnt});
			},
			function (k,v) {
				var r=null;
				v.forEach(function(v) {
					if (!r)
						r = v;
					else {
						r.mem += v.mem;
						r.c += v.c;
					}
				});
				return r;
			},
			{
				query: query,
				out: {inline:1},
				scope:{Q: p.quant}
			}, safe.sure(cb, function (data) {
				_.each(data, function (metric) {
					var key = metric.value;
					key.mema = key.mem/key.c;
				});
				cb(null, data);
			})
		);
	}));
},
////////////////////
///////////aggregate
////////////////////
function(cb) {
    var query = queryfix(p.filter);
    checkAccess(t, query, safe.sure(cb, function() {
        var Q = p.quant;
        var _dt0 = new Date(0);
        metrics.aggregate([{
                $match: query
            },
            {
                $group: {
                    _id: {
                        $trunc: {
                            $divide: [{
                                $subtract: ["$_dt", _dt0]
                            }, {
                                $multiply: [Q, 60000]
                            }]
                        }
                    },
                    mem: {
                        $sum: "$_f_val"
                    },
                    c: {
                        $sum: "$_i_cnt"
                    }
                }
            },
            {
                $project: {
                    value: {
                        mem: "$mem",
                        c: "$c",
                        mema: {
                            $divide: ["$mem", "$c"]
                        }
                    }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ], cb);
    }))
}
,],
function(err,res){
//_.forEach(res[0], function(data){data.value.r = Math.round(data.value.r*100)/100});
//_.forEach(res[1], function(data){data.value.r = Math.round(data.value.r*100)/100});
//console.log("mapReduce:", JSON.stringify(res[0]));
//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
//console.log("aggregate:", JSON.stringify(res[1]));
//console.log("length:", res[0].length, res[1].length);
//console.log(_.isEqual(JSON.stringify(_.sortBy(res[0]),"_id"), JSON.stringify(_.sortBy(res[1],"_id"))));
cb(null, res[1]);
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

}));
}));
};
