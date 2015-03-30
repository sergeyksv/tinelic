"use strict";
var _ = require("lodash");
var safe = require("safe");
var mongo = require("mongodb");
var moment = require("moment");
var request = require('request');

var buf = new Buffer(35);
buf.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

module.exports.deps = ['mongo','prefixify','validate'];

module.exports.init = function (ctx, cb) {
    var prefixify = ctx.api.prefixify.datafix;
    var queryfix = ctx.api.prefixify.queryfix;
    ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
        safe.parallel([
            function (cb) {
                db.collection("page_errors",cb)
            },
            function (cb) {
                db.collection("pages",cb)
            },
            function (cb) {
                db.collection("page_reqs", cb)
            },
            function (cb) {
                db.collection("actions", cb)
            },
            function (cb) {
                db.collection("action_stats", cb)
            },
            function (cb) {
                db.collection("action_errors", cb)
            },
            function (cb) {
                db.collection("metrics", cb)
            }
        ],safe.sure_spread(cb, function (events,pages,ajax, actions, as, serverErrors, metrics) {
            cb(null, {api:{
                getMetrics: function(t, p, cb) {
                    var query = queryfix(p.filter)
                    metrics.mapReduce(
                        function() {
                            emit(this._s_pid, {mem: (this._f_val/this._i_cnt)})
                        },
                        function(k,v) {
                            var r = null
                            v.forEach(function(v) {
                                if (!r) {
                                    r = v
                                }
                                else {
                                    r.mem = (r.mem + v.mem)/2
                                }
                            })
                            return r
                        },
                        {
                            query: query,
                            out:{inline: 1}
                        },
                        safe.sure(cb, function(data) {
                            var memtt = 0;
                            _.forEach(data,function(r) {
                                memtt += parseInt(r.value.mem)
                            })
                            cb(null,{proc: data.length, mem: memtt})
                        })
                    )
                },
                getActions: function(t, p, cb) {
                    var query = queryfix(p.filter);
                    query._s_cat = "WebTransaction"
                    var q = p.quant || 1;
                    actions.mapReduce(
                        "function() {\
                            emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {r: 1.0/"+q+", tt: this._i_tt})\
						}",
                        function (k,v) {
                            var t = 200; //apdex T
                            var f = 4*t;
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v;
                                    r.apdex = [(v.tt <= t) ? 1 : 0, (v.tt > t && v.tt <= f) ? 1 : 0, 1];
                                }
                                else {
                                    r.r += v.r;
                                    r.tt = (r.tt + v.tt)/2;
                                    r.apdex[0] += (v.tt <= t)?1:0;
                                    r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
                                    r.apdex[2] += 1;
                                }
                            })
                            r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getTopTransactions: function(t, p , cb) {
                    var query = queryfix(p.filter);
                    query._s_cat = "WebTransaction"
                    var q = p.quant || 1;
                    var t = 200; //apdex T
                    var f = 4*t;
                    actions.mapReduce(
                        "function() {\
                            emit(this._s_name, {tt: this._i_tt*(1.0/"+q+"), tta: this._i_tt, r: 1.0/"+q+",apdex:(((this._i_tt <= "+t+")?1:0)+((this._i_tt>"+t+"&&this._i_tt <= "+f+")?1:0)/2)/1})\
						}",
                        function (k,v) {
                            var t = 200; //apdex T
                            var f = 4*t;
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v
                                    r.apdex = [(v.tta <= t) ? 1 : 0, (v.tta > t && v.tta <= f) ? 1 : 0, 1];
                                }
                                else {
                                    r.tt += v.tt;
                                    r.tta = parseInt(((r.tta+v.tta)/2));
                                    r.r += v.r
                                    r.apdex[0] += (v.tta <= t)?1:0;
                                    r.apdex[1] += (v.tta > t && v.tta <= f)?1:0;
                                    r.apdex[2] += 1;
                                }
                            })
                            r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        safe.sure(cb, function(data) {
                            var st = p.st
                            if (st) {
                                data =_.sortBy(data, function(v){
                                    if (st == "rpm")
                                        return -1*v.value.r;
                                    if (st == "mtc")
                                        return -1* v.value.tt;
                                    if (st == "sar")
                                        return -1* v.value.tta;
                                    if (st == "wa")
                                        return 1* v.value.apdex;
                                })

                                var sum=0;
                                _.each(data, function(r){
                                    if (st == "rpm")
                                        sum+=r.value.r
                                    if (st == "mtc")
                                        sum += r.value.tt
                                    if (st == "sar")
                                        sum += r.value.tta
                                    if (st == "wa") {
                                        sum = 1;
                                        (r.value.apdex < sum) ?	(sum = r.value.apdex) : null
                                    }
                                })
                                var percent = sum/100;
                                _.each(data, function (r) {
                                    if (st == "rpm") {
                                        r.value.bar = Math.round(r.value.r/percent);
                                        r.value.r = r.value.r.toFixed(2)
                                    }
                                    if (st == "mtc") {
                                        r.value.bar = Math.round(r.value.tt/percent);
                                        r.value.tt = r.value.tt.toFixed(1);
                                        r.value.r = p.quant*(r.value.r.toFixed(1))
                                        r.value.tta = (r.value.tta/1000).toFixed(2)
                                    }
                                    if (st == "sar") {
                                        r.value.bar = Math.round(r.value.tta/percent);
                                        r.value.tta = (r.value.tta/1000).toFixed(2)
                                    }
                                    if (st == "wa") {
                                        r.value.bar = Math.round(r.value.apdex/percent);
                                        r.value.apdex = r.value.apdex.toFixed(2);
                                    }
                                })
                            }
                            else {
                                data = _.take(_.sortBy(data, function(r) {
                                    return r.value.tt*-1
                                }),10)
                                var progress = null;
                                _.forEach(data,function(r) {
                                    if (!progress) {
                                        progress = r.value.tt
                                    }
                                    else {
                                        progress += r.value.tt
                                    }
                                })
                                _.forEach(data, function(r) {
                                    r.value.progress = (r.value.tt/progress)*100
                                    r._id = r._id.replace(/(^GET)?(^POST)?/,'')
                                })
                            }
                            cb(null, data)
                        })
                    )
                },
                getTopAjax: function(t, p, cb) {
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    ajax.mapReduce(
                        "function() {\
                            emit(this._s_name, {tt: this._i_tt, tta: (this._i_tt/1000).toFixed(2)})\
                        }",
                        function (k,v) {
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v;
                                    r.tta = v.tt;
                                }
                                else {
                                    r.tt += v.tt;
                                    r.tta = (r.tta+v.tt)/2;
                                }
                            })
                            r.tta = (r.tta/1000).toFixed(2)
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getTopPages: function(t, p, cb) {
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    var t = 4000; //apdex T
                    var f = 4*t;
                    pages.mapReduce(
                        "function() {\
                            emit(this._s_route, {tt: this._i_tt*(1.0/"+q+"), tta: this._i_tt, r: 1.0/"+q+", apdex:(((this._i_tt <= "+t+")?1:0)+((this._i_tt>"+t+"&&this._i_tt <= "+f+")?1:0)/2)/1})\
						}",
                        function (k,v) {
                            var t = 4000; //apdex T
                            var f = 4*t;
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v
                                    r.apdex = [(v.tta <= t) ? 1 : 0, (v.tta > t && v.tta <= f) ? 1 : 0, 1];
                                }
                                else {
                                    r.tt += v.tt;
                                    r.tta = Number(((r.tta+v.tta)/2).toFixed(3));
                                    r.r += v.r
                                    r.apdex[0] += (v.tta <= t)?1:0;
                                    r.apdex[1] += (v.tta > t && v.tta <= f)?1:0;
                                    r.apdex[2] += 1;
                                }
                            })
                            r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getEvents:function (t, p, cb) {
                    // dummy, just get it all out
                    events.find().toArray(cb)
                },
                getEvent:function (t, p, cb) {
                    // dummy, just get it all out
                    events.findOne({_id:new mongo.ObjectID(p._id)},cb);
                },
                getServerErrorInfo:function (t, p, cb) {
                    var query = queryfix(p.filter);

                    serverErrors.findOne(query, safe.sure(cb, function (err) {
                        var st = (err.stacktrace && err.stacktrace.frames && err.stacktrace.frames.length) || 0;
                        var query = {_idp:err._idp,_s_logger:err._s_logger,"exception._s_value": err.exception._s_value,"stacktrace.frames":{$size:st}};

                        serverErrors.mapReduce(function () {
                                var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
                                var route = {};
                                if (this.action){
									route[this.action._s_name]=1;
								}
                                var reporter = {}; reporter[this._s_reporter]=1;
                                var server = {}; server[this._s_server]=1;
                                var lang = {}; lang[this._s_logger]=1;
                                var ids = [this._id];
                                emit(this._s_logger+this.exception._s_value+st,{c:1,route:route,reporter:reporter,server:server,lang:lang,ids:ids})
                            },
                            function (k, v) {
                                var r=null;
                                v.forEach(function (v) {
                                    if (!r)
                                        r = v
                                    else {
                                        r.ids = r.ids.concat(v.ids);
                                        r.c+=v.c;
                                        for (var k in v.route) {
                                            r.route[k]=(r.route[k] || 0) + v.route[k];
                                        }
                                        for (var k in v.reporter) {
                                            r.reporter[k]=(r.reporter[k] || 0) + v.reporter[k];
                                        }
                                        for (var k in v.server) {
                                            r.server[k]=(r.server[k] || 0) + v.server[k];
                                        }
                                        for (var k in v.lang) {
                                            r.lang[k]=(r.lang[k] || 0) + v.lang[k];
                                        }
                                    }
                                })
                                return r;
                            },
                            {
                                query: query,
                                out: {inline:1}
                            },
                            safe.sure(cb, function (stats) {
                                var res = stats[0].value;
                                var res1 = {route:[],server:[],reporter:[],lang:[], count:res.c,ids:_.sortBy(res.ids)}
                                _.each(res.route, function (v,k) {
                                    res1.route.push({k:k,v:v})
                                })
                                _.each(res.server, function (v,k) {
                                    res1.server.push({k:k,v:v})
                                })
                                _.each(res.reporter, function (v,k) {
                                    res1.reporter.push({k:k,v:v})
                                })
                                _.each(res.lang, function (v,k) {
                                    res1.lang.push({k:k,v:v})
                                })
                                cb(null,res1);
                            })
                        )
                    }))
                },
                getServerError:function (t, p, cb) {
                    // dummy, just get it all out
                    serverErrors.findOne({_id:new mongo.ObjectID(p._id)},cb);
                },
                getAjaxStats:function(t, p, cb) {
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    ajax.mapReduce(
                        "function() {\
                            emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {c:1,pt: this._i_pt,tt:this._i_tt, code: this._code, r:1.0/"+q+", e:1.0*(this._i_code != 200 ? 1:0 )/"+q+"})\
						}",
                        function (k,v) {
                            var t = 400; //apdex T
                            var f = 4*t;
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v;
                                    r.apdex = [(v.tt <= t) ? 1 : 0, (v.tt > t && v.tt <= f) ? 1 : 0, 1];
                                }
                                else {
                                    r.tt = (r.tt + v.tt)/2;
                                    r.c+=v.c;
                                    r.e+=v.e;
                                    r.r+=v.r;
                                    r.pt+= v.pt;
                                    r.apdex[0] += (v.tt <= t)?1:0;
                                    r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
                                    r.apdex[2] += 1;
                                }
                            })
                            r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getPageViews:function (t, p, cb) {
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    pages.mapReduce("function () {\
							emit(parseInt(this._dt.valueOf()/("+q+"*60000)),{c:1,r:1.0/"+q+",e:1.0*(this._i_err?1:0)/"+q+",tt:this._i_tt})\
						}",
                        function (k, v) {
                            var t = 4000; //apdex T
                            var f = 4*t;
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v;
                                    r.apdex = [(v.tt <= t)?1:0,(v.tt > t && v.tt <= f)?1:0,1]

                                }
                                else {
                                    r.tt=(r.tt*r.c+v.tt*v.c)/(r.c+v.c);
                                    r.c+=v.c;
                                    r.e+=v.e;
                                    r.r+=v.r;
                                    r.apdex[0] += (v.tt <= t)?1:0;
                                    r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
                                    r.apdex[2] += 1;
                                }
                            })
                            r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getEventInfo:function (t, p, cb) {
                    var query = queryfix(p.filter);

                    events.findOne(query, safe.sure(cb, function (event) {
                        var st = (event.stacktrace && event.stacktrace.frames && event.stacktrace.frames.length) || 0;
                        var query = {_idp:event._idp,_s_logger:event._s_logger,_s_message:event._s_message,"stacktrace.frames":{$size:st}};

                        events.mapReduce(function () {
                                var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
                                var route = {}; route[this.request.route]=1;
                                var browser = {}; browser[this.agent.family+" "+this.agent.major]=1;
                                var os = {}; os[this.agent.os.family]=1;
                                var sessions = {}; sessions[this.shash]=1;
                                var views = {}; views[this._idpv]=1;
                                var ids = [this._id];
                                emit(this._s_logger+this._s_message+st,{c:1,route:route,browser:browser,os:os,sessions:sessions,views:views,ids:ids})
                            },
                            function (k, v) {
                                var r=null;
                                v.forEach(function (v) {
                                    if (!r)
                                        r = v
                                    else {
                                        r.ids = r.ids.concat(v.ids);
                                        for (var k in v.sessions) {
                                            r.sessions[k]=1;
                                        }
                                        for (var k in v.views) {
                                            r.views[k]=1;
                                        }
                                        r.c+=v.c;
                                        for (var k in v.route) {
                                            r.route[k]=(r.route[k] || 0) + v.route[k];
                                        }
                                        for (var k in v.browser) {
                                            r.browser[k]=(r.browser[k] || 0) + v.browser[k];
                                        }
                                        for (var k in v.os) {
                                            r.os[k]=(r.os[k] || 0) + v.os[k];
                                        }
                                    }
                                })
                                return r;
                            },
                            {
                                query: query,
                                out: {inline:1}
                            },
                            safe.sure(cb, function (stats) {
                                var res = stats[0].value;
                                var res1 = {route:[],os:[],browser:[],count:res.c,sessions:_.size(res.sessions),views:_.size(res.views),ids:_.sortBy(res.ids)}
                                _.each(res.route, function (v,k) {
                                    res1.route.push({k:k,v:v})
                                })
                                _.each(res.os, function (v,k) {
                                    res1.os.push({k:k,v:v})
                                })
                                _.each(res.browser, function (v,k) {
                                    res1.browser.push({k:k,v:v})
                                })
                                cb(null,res1);
                            })
                        )
                    }))
                },
                getPagesErrorStats:function (t, p, cb) {
                    var query = queryfix(p.filter);
                    var st = p.st
                    events.mapReduce(function () {
                            var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
                            var s = {}; s[this.shash]=1;
                            var epm = {}; epm[this._idpv]=1;
                            emit(this._s_logger+this._s_message+st,{c:1,s:s,_dtmax:this._dt,_dtmin:this._dt, _id:this._id,epm:epm})
                        },
                        function (k, v) {
                            var r=null;
                            v.forEach(function (v) {
                                if (!r)
                                    r = v
                                else {
                                    for (var k in v.s) {
                                        r.s[k]=1;
                                    }
                                    for (var k in v.epm) {
                                        r.epm[k]=1;
                                    }
                                    r.c+=v.c;
                                    r._dtmin = Math.min(r._dtmin, v._dtmin);
                                    r._dtmax = Math.min(r._dtmax, v._dtmax);
                                    (r._dtmax==v._dtmax) && (r._id = v._id);
                                }
                            })
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        safe.sure(cb, function (stats) {
                            _.each(stats, function (s) {
                                s.value.s = _.size(s.value.s);
                                s.value.epm = _.size(s.value.epm);
                            } );
                            stats = _.sortBy(stats, function (s) { return -1*s.value.s*s.value.epm; } );
                            var ids = {};
                            _.each(stats, function (s) {
                                ids[s.value._id]={stats:s.value};
                            } );
                            events.find(queryfix({_id:{$in:_.keys(ids)}}))
                                .toArray(safe.sure(cb, function (errors) {
                                    _.each(errors, function (e) {
                                        ids[e._id].error = e;
                                    })
                                    var data = _.values(ids)
                                    var p = null
                                    if (st == "terr" || st == undefined)
                                        p = 'c';
                                    if (st == "perr")
                                        p = 'epm'
                                    if (st == "serr")
                                        p = 's'
                                    var sum = 0.0
                                    _.forEach(data, function(r) {
                                        if (p)
                                            sum += r.stats[p]
                                    })
                                    var percent = sum/100
                                    _.forEach(data, function(r) {
                                        if (p)
                                            r.bar = r.stats[p]/percent
                                    })
                                    data = _.sortBy(data, function(r) {return r.stats[p]*-1})
                                    cb(null, data);
                                }))
                        })
                    )
                },
                getPagesErrorTiming:function(t, p, cb) {
					var query1 = queryfix(p.filter);
					var q = p.quant || 1;
					events.findOne(query1, safe.sure(cb, function (event) {
						var query =(query1._id)? {_idp:event._idp, _s_message:event._s_message,_dt:query1._dt}: query1;
						events.mapReduce(
							"function() {\
								emit(parseInt(this._dt.valueOf()/("+q+"*60000)), { r:1.0/"+q+"})\
							}",
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r){
										r = v
									}
									else {
										r.r+=v.r;

									}
								})
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							cb
						)
					}))
				},
				getServerErrorRpm:function(t, p, cb) {
					var query1 = queryfix(p.filter);
					var q = p.quant || 1;
					serverErrors.findOne(query1, safe.sure(cb, function (event) {
						var query =(query1._id)? {_idp:event._idp, _s_message:event._s_message,_dt:query1._dt}: query1;
						serverErrors.mapReduce(
							"function() {\
								emit(parseInt(this._dt.valueOf()/("+q+"*60000)), { r:1.0/"+q+"})\
							}",
							function (k,v) {
								var r=null;
								v.forEach(function (v) {
									if (!r){
										r = v
									}
									else {
										r.r+=v.r;

									}
								})
								return r;
							},
							{
								query: query,
								out: {inline:1}
							},
							cb
						)
					}))
				},
                getServerErrorStats:function (t, p, cb) {
                    var query = queryfix(p.filter);
                    serverErrors.mapReduce(function () {
                            var st = (this.stacktrace && this.stacktrace.frames && this.stacktrace.frames.length) || 0;
                            emit(this._s_message,{c:1,_dtmax:this._dt,_dtmin:this._dt, _id:this._id})
                        },
                        function (k, v) {
                            var r=null;
                            v.forEach(function (v) {
                                if (!r)
                                    r = v
                                else {
                                    r.c+=v.c;
                                    r._dtmin = Math.min(r._dtmin, v._dtmin);
                                    r._dtmax = Math.min(r._dtmax, v._dtmax);
                                    (r._dtmax==v._dtmax) && (r._id = v._id);
                                }
                            })
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        safe.sure(cb, function (stats) {
                            stats = _.sortBy(stats, function (s) { return (-1*s.value.c) } );
                            var ids = {};
                            _.each(stats, function (s) {
                                ids[s.value._id]={stats:s.value, error: s._id};
                            } );
                            serverErrors.find(queryfix({_id:{$in:_.keys(ids)}}))
                                .toArray(safe.sure(cb, function (errors) {
                                    _.each(errors, function (e) {
                                        ids[e._id].error = e;
                                    })
                                    cb(null, _.values(ids));
                                }))
                        })
                    )
                },
                getJSByTrace:function (t, p, cb) {
                    var url = p._s_file.trim();

                    request.get({url:url}, safe.sure(cb, function (res, body) {
                        if (res.statusCode!=200)
                            return cb(new Error("Error, status code " + res.statusCode));
                        var lineno=0,lineidx=0;
                        while (lineno<parseInt(p._i_line)-1) {
                            lineidx = body.indexOf('\n',lineidx?(lineidx+1):0);
                            if (lineidx==-1)
                                return cb(new Error("Line number '"+p._i_line+"' is not found"));
                            lineno++;
                        }
                        var idx = lineidx+parseInt(p._i_col);
                        body = body.substring(0,idx)+"_t__pos____"+body.substring(idx);
                        if (idx>=body.length)
                            return cb(new Error("Column number '"+p.colno+"' is not found"));
                        var block = body.substring(Math.max(idx-80,0),Math.min(idx+80,body.length-1));

                        return cb(null, block)
                    }))
                },
                getAjaxRpm:function(t, p, cb) {
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    if (!p.Graph_bool) {
                        ajax.mapReduce(
                            "function() {\
                                emit(this._s_name, { r:1.0/"+q+", dt:this._dt, tt:this._i_tt, tta: (this._i_tt/1000).toFixed(2)})\
							}",
                            function (k,v) {
                                var t = 400; //apdex T
                                var f = 4*t;
                                var r=null;
                                v.forEach(function (v) {
                                    if (!r){
                                        r = v
                                        r.tta = v.tt;
                                        r.apdex = [(v.tt <= t) ? 1 : 0, (v.tt > t && v.tt <= f) ? 1 : 0, 1];
                                    }
                                    else {
                                        r.r+=v.r;
                                        r.dt=v.dt;
                                        r.tt = (r.tt + v.tt)/2;
                                        r.tta = Number((r.tta+v.tt)/2);
                                        r.apdex[0] += (v.tt <= t)?1:0;
                                        r.apdex[1] += (v.tt > t && v.tt <= f)?1:0;
                                        r.apdex[2] += 1;
                                    }
                                })
                                r.tta = Number((r.tta/1000).toFixed(2))
                                r.apdex = (r.apdex[0]+ (r.apdex[1]/2))/ r.apdex[2]
                                return r;
                            },
                            {
                                query: query,
                                out: {inline:1}
                            },
                            cb
                        )
                    }
                    else {
                        query._s_name=p._idurl;
                        ajax.mapReduce(
                            "function() {\
                            emit(parseInt(this._dt.valueOf()/("+q+"*60000)), {c:1, r:1.0/"+q+",tt:this._i_tt})\
							}",
                            function (k,v) {
                                var t = 400; //apdex T
                                var f = 4*t;
                                var r=null;
                                v.forEach(function (v) {
                                    if (!r)
                                        r = v
                                    else {
                                        r.tt=(r.tt*r.c+v.tt*v.c)/(r.c+v.c);
                                        r.c+=v.c;
                                        r.r+=v.r;
                                    }
                                })
                                return r;
                            },
                            {
                                query: query,
                                out: {inline:1}
                            },
                            cb
                        )
                    }
                },
                getActionsBreakdown: function(t,p, cb) {
                    var query = queryfix(p.filter);
                    query._s_cat = "WebTransaction"
                    var q = p.quant || 1;
                    as.mapReduce(
                        function() {
                                this.data.forEach(function(k,v) {
                                    emit(k._s_name, {cnt: k._i_cnt, tt: k._i_tt})
                                })
                        },
                        function (k,v) {
                            var r=null;
                            v.forEach(function(v) {
                                if (!r) {
                                    r = v
                                }
                                else {
                                    r.cnt += v.cnt
                                    r.tt += v.tt
                                }
                            })
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getActionsCategoryStats: function(t,p, cb) {
                    var query = queryfix(p.filter);
                    query['data._s_cat'] = "Datastore"
                    var st = p.st
                    var q = p.quant || 1;
                    as.mapReduce(
                        function() {
                            this.data.forEach(function(k) {
                                if (k._s_cat == CAT) {
                                    emit(k._s_name, {tt: k._i_tt, r: k._i_cnt, avg: k._i_tt/k._i_cnt, tta:k._i_tt});
                                }
                            })},
                        function (k,v) {
                            var r = null;
                            v.forEach(function(v) {
                                if (!r) {
                                    r = v
                                }
                                else {
                                    r.tt += v.tt;
                                    r.avg = (r.avg + v.avg)/2
                                    r.r += v.r
                                    r.tta = parseInt(((r.tta+v.tta)/2))
                                }
                            });
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1},
                            scope: {CAT: query['data._s_cat']}
                        },
                        safe.sure(cb, function(data) {
                            var sum = 0;
                            _.forEach(data, function(r) {
                                if (st == "req")
                                    sum += r.value.r
                                if (st == 'mtc' || st == undefined)
                                    sum += r.value.tt
                                if (st == 'sar')
                                    sum += r.value.avg
                            })
                            var procent = sum/100
                            _.forEach(data, function(r) {
                                if (st == 'req')
                                    r.value.bar = r.value.r/procent
                                if (st == 'mtc'|| st == undefined) {
                                    r.value.bar = r.value.tt/procent
                                    r.value.tta = (r.value.tta/1000).toFixed(2)
								}
                                if (st == 'sar')
                                    r.value.bar = r.value.avg/procent
                            })
                            data = _.sortBy(data, function(r) {
                                r.value.avg = parseInt(r.value.avg)
                                if (st == 'req')
                                    return r.value.r*-1
                                if (st == 'mtc' || st == undefined)
                                    return r.value.tt*-1
                                if (st == 'sar')
                                    return r.value.avg*-1
                            })
                            if (st == undefined) {
                                data = _.take(data,10)
                            }
                            cb(null, data)
                        })
                    )
                },
                pagesBreakDown: function(t,p,cb){
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    pages.find(query,{_id: 1}).toArray(safe.sure(cb, function(data){
                        delete query._s_uri
                        var idpv = []
                        _.forEach(data, function(r){
                            idpv.push(r._id)
                        })
                        query._idpv = {$in: idpv}
                        ajax.mapReduce(
                            "function() {\
                                emit(this._s_name, {r: 1.0/"+q+", tt: this._i_tt} )\
                            }",
                            function (k,v) {
                                var r=null;
                                v.forEach(function (v) {
                                    if (!r)
                                        r = v
                                    else {
                                        r.r += v.r
                                        r.tt = (r.tt + v.tt)/2
                                    }
                                })
                                return r;
                            },
                            {
                                query: query,
                                out: {inline:1}
                            },
                            cb
                        )
                    }))
                },
                ajaxBreakDown: function(t,p,cb){
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    ajax.mapReduce(
                        "function() {\
                            emit(this._s_name, { route: this._s_route, pag: []} )\
                        }",
                        function (k,v) {
                            var r=null;
                            v.forEach(function (v) {
                                if (!r)
                                    r = v
                                else {
                                    r.pag.push(v.route)
                                }
                            })
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1}
                        },
                        cb
                    )
                },
                getActionsCategoryTimings:function (t, p, cb) {
                    var query = queryfix(p.filter);
                    var name = query["data._s_name"]
                    var q = p.quant || 1;
                    as.mapReduce(function () {
                            var dt = parseInt(this._dt.valueOf()/(QUANT*60000))
                            this.data.forEach(function(k) {
								if (!NAME || k._s_name == NAME) {
                                    emit(dt,{r: k._i_cnt, tt: k._i_tt});
                                }
                            })
						},
                        function (k, v) {
                            var r=null;
                            v.forEach(function (v) {
                                if (!r) {
                                    r = v
                                }
                                else {
                                    r.r += v.r
                                    r.tt += v.tt
                                }
                            })
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1},
                            scope: {NAME: name, QUANT: q}
                        },
                        cb
                    )
                },
                getActionsCallees: function(t,p, cb) {
                    var query = queryfix(p.filter);
                    var q = p.quant || 1;
                    as.mapReduce(
                        function() {
                            this.data.forEach(function(k,v) {
                                if (k._s_cat == CAT) {
                                    emit(k._s_name, {cnt: k._i_cnt, tt: k._i_tt})
                                }
                            })
                        },
                        function (k,v) {
                            var r=null;
                            v.forEach(function(v) {
                                if (!r) {
                                    r = v
                                }
                                else {
                                    r.cnt += v.cnt
                                    r.tt += v.tt
                                }
                            })
                            return r;
                        },
                        {
                            query: query,
                            out: {inline:1},
                            scope: {CAT: query['data._s_cat']}
                        },
                        cb
                    )
                }
            }});
        }))
    }))
}

