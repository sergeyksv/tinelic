/*jslint node: true */
var _ = require("lodash");
var safe = require("safe");
var path = require("path");
var express = require('express');
var moment = require('moment');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var lxval = require('lx-valid');
var crypto = require('crypto');

var CustomError = module.exports.CustomError  = function (message, subject) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.subject = subject;
};

/**
 * @property {Object} invalid validation result object
 * @type {Function}
 */
var ValidationError = module.exports.ValidationError = function (invalid) {
	this.constructor.prototype.__proto__ = Error.prototype;
	var es = "Validation fails: ";

	_.each(invalid.errors, function (error) {
		es += error.property + " " + error.message + " ";
		if (error.expected)
			es += ", expected  " + JSON.stringify(error.expected);
		if (error.actual)
			es += ", actual " + JSON.stringify(error.actual);
		es += "; ";
	});

	this.name = 'ValidationError';
	this.message = es;
	this.subject = 'Invalid Data';
	this.data = _.reduce(invalid.errors, function (m, f) {
		m.push(_.pick(f, ['property', 'message']));
		return m;
	},[]);
};

module.exports.createApp = function (cfg, cb) {
	var app = express();
	app.use(function (req, res, next) {
		req.setMaxListeners(20);
		next();
	});
	app.use(require("compression")());
	app.use(cookieParser());
	app.use(bodyParser.json({ limit: "20mb" }));
	app.use(bodyParser.raw({ limit: "50mb" })); // to parse getsentry "application/octet-stream" requests
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(multer());
	var api = {};
	var locals = {};
	var auto = {};
	var registered = {};
	var requested = {};

	_.each(cfg.modules, function (module) {
		registered[module.name]=1;
		var mod = module.object || null;
		if (module.require) {
			var mpath = module.require;
			if (mpath.charAt(0)==".")
				mpath = path.resolve(path.dirname(require.main.filename),mpath);
			mod = require(mpath);
		}
		if (!mod)
			return cb(new Error("Can't not load module " + module.name));
		var args = _.clone(module.deps || []);
		args = _.union(mod.deps || [],args);
		_.each(args, function (m) {
			requested[m]=1;
		});
		args.push(function (cb) {
			var router = null;
			if (!mod.reqs || mod.reqs.router!==false) {
				router = express.Router();
				app.use("/"+module.name,router);
			}
			var dt = new Date();
			mod.init({api:api,locals:locals,cfg:cfg.config,app:this,express:app,router:router}, safe.sure(cb, function (mobj) {
				console.log("loaded "+ module.name + " in "+((new Date()).valueOf()-dt.valueOf())/1000.0+" s");

				api[module.name]=mobj.api;
				cb();
			}));
		});
		auto[module.name]=args;
	});
	var missing = _.difference(_.keys(requested),_.keys(registered));
	if (missing.length)
		return safe.back(cb, new Error("Missing module dependancies: " + missing.join(',')));
	var dt = new Date();
	safe.auto(auto, safe.sure(cb, function () {
		console.log("-> ready in "+((new Date()).valueOf()-dt.valueOf())/1000.0+" s");
		cb(null, {express:app,api:api,locals:locals});
	}));
};

module.exports.restapi = function () {
	return {
		deps:['tson'],
		init: function (ctx, cb) {
			ctx.router.all("/:token/:module/:target",function (req, res) {
				if (ctx.locals.newrelic)
					ctx.locals.newrelic.setTransactionName(req.method+"/"+(req.params.token=="public"?"public":"token")+"/"+req.params.module+"/"+req.params.target);
				var next = function (err) {
					var statusMap = {"Unauthorized":401,"Access forbidden":403,"Invalid Data":422};
					var code = statusMap[err.subject] || 500;
					res.status(code).json(_.pick(err,['message','subject','data']));
				};
				if (!ctx.api[req.params.module])
					throw new Error("No api module available");
				if (!ctx.api[req.params.module][req.params.target])
					throw new Error("No function available");

				var params = (req.method == 'POST')?req.body:req.query;

				if (req.query._t_son=='in' || req.query._t_son=='both')
					params = ctx.api.tson.decode(params);

				ctx.api[req.params.module][req.params.target](req.params.token, (req.method == 'POST')?req.body:req.query, safe.sure(next, function (result) {

					if (req.query._t_son=='out' || req.query._t_son=='both')
						result = ctx.api.tson.encode(result);

					var maxAge = 0;
					if (req.query._t_age) {
						var age = req.query._t_age;
						var s = age.match(/(\d+)s?$/); s = s?parseInt(s[1]):0;
						var m = age.match(/(\d+)m/); m = m?parseInt(m[1]):0;
						var h = age.match(/(\d+)h/); h = h?parseInt(h[1]):0;
						var d = age.match(/(\d+)d/); d = d?parseInt(d[1]):0;
						maxAge = moment.duration(d+"."+h+":"+m+":"+s).asSeconds();
					}

					if (maxAge) {
						res.header('Cache-Control','public');
						res.header("Max-Age", maxAge );
						res.header("Expires", (new Date((new Date()).valueOf()+maxAge*1000)).toGMTString());
					} else {
						res.header('Cache-Control','private, no-cache, no-store, must-revalidate');
						res.header('Expires', '-1');
						res.header('Pragma', 'no-cache');
					}

					res.json(_.isUndefined(result)?null:result);
				}));
			});
			cb(null, {
				api: {
				}
			});
		}
	};
};

module.exports.prefixify = function () {
	return {
		reqs:{router:false},
		init:function (ctx,cb) {
			cb(null, {api:require('./prefixify')});
		}
	};
};

module.exports.tson = function () {
	return {
		reqs:{router:false},
		init:function (ctx,cb) {
			cb(null, {api:require('./tson')});
		}
	};
};

module.exports.mongodb = function () {
	return {
		reqs:{router:false},
		deps:['prefixify'],
		init:function (ctx,cb) {
			var mongo = require("mongodb");
			ctx.api.prefixify.register("_id",function (pr) {
				return new mongo.ObjectID(pr.toString());
			});

			var dbcache = {};
			var indexinfo = {};
			cb(null, {
				api:{
					getDb:function (prm,cb) {
						var name = prm.name || "main";
						if (dbcache[name])
							return safe.back(cb,null,dbcache[name]);
						var cfg = ctx.cfg.mongo[name];
						if (!cfg)
							return safe.back(cb, new Error("No mongodb database for alias "+name));

						var dbc = new mongo.Db(
							cfg.db,
							new mongo.Server(
								cfg.host,
								cfg.port,
								cfg.scfg
							),
							cfg.ccfg
						);
						dbc.open(safe.sure(cb, function (db) {
							dbcache[name]=db;
			  if(!cfg.auth)
				return cb(null,db);
			  db.authenticate(cfg.auth.user,cfg.auth.pwd,cfg.auth.options,safe.sure(cb,function(){
				cb(null,db);
			  }))
						}));
					},
					ensureIndex:function (col, index, options, cb) {
						if (_.isFunction(options)) {
							cb = options;
							options = {};
						}

						var dbkey = col.db.serverConfig.name+"/"+col.db.databaseName;
						var dbif = indexinfo[dbkey];
						if (!dbif) {
							dbif = indexinfo[dbkey]={};
						}
						var colkey = col.collectionName;
						var cif = dbif[colkey];
						if (!cif) {
							cif = dbif[colkey]={_id_:true};
						}
						col.ensureIndex(index, options, safe.sure(cb, function (indexname) {
							cif[indexname]=true;
							cb();
						}));
					},
					dropUnusedIndexes:function (db, cb) {
						var dbkey = db.serverConfig.name+"/"+db.databaseName;
						var dbif = indexinfo[dbkey];
						if (!dbif)
							return safe.back(cb, null);
						safe.each(_.keys(dbif), function (colName, cb) {
							db.indexInformation(colName, safe.sure(cb, function (index) {
								var unused = _.difference(_.keys(index),_.keys(dbif[colName]));
								safe.each(unused, function (indexName,cb) {
									db.dropIndex(colName, indexName, cb);
								},cb);
							}));
						},cb);
					}
				}
			});
		}
	};
};

module.exports.obac = function () {
	return {
		reqs:{router:false},
		init:function (ctx,cb) {
			var _acl = [];
			cb(null, {
				api:{
					getPermission: function (t, p, cb) {
						ctx.api.obac.getPermissions(t, {rules:[p]}, safe.sure(cb, function (res) {
							var granted = !!res[p.action][p._id ||'global'];
							if (!p.throw)
								cb(null, granted);
							else
								cb(granted?null:new CustomError("Access denied to "+p.action, "Unauthorized"));
						}));
					},
					getPermissions:function (t, p, cb) {
						var result = {};
						safe.forEachOf(p.rules, function (rule, cb) {
							var acl = _.filter(_acl, function (a) {
								return a.r.test(rule.action);
							});
							var checks = [];
							_.each(acl, function (a) {
								if (a.f.permission) {
									checks.push(function (cb) {
										ctx.api[a.m][a.f.permission](t,rule,cb);
									});
								}
							});
							safe.parallel(checks, safe.sure(cb, function (answers) {
								var answer = false;
								// if any arbiter allow some action then
								// we consider it allowed (or check)
								_.each(answers, function (voice) {
									answer |= voice;
								});
								if (!result[rule.action])
									result[rule.action] = {};
								result[rule.action][rule._id || 'global']=!!answer;
								cb();
							}));
						}, safe.sure(cb,function () {
							cb(null,result);
						}));
					},
					getGrantedIds:function (t, p, cb) {
						var acl = _.filter(_acl, function (a) {
							return a.r.test(p.action);
						});
						var checks = [];
						_.each(acl, function (a) {
							if (a.f.grantids) {
								checks.push(function (cb) {
									ctx.api[a.m][a.f.grantids](t,p,cb);
								});
							}
						});
						safe.parallel(checks, safe.sure(cb, function (answers) {
							cb(null, answers.length==1?answers[0]:_.intersection.apply(_,answers));
						}));
					},
					register:function(actions, module, face) {
						_.each(actions, function (a) {
							_acl.push({m:module, f:face, r:new RegExp(a.replace("*",".*"))});
						});
					}
				}
			});
		}
	};
};

module.exports.validate = function () {
	var updater = require("./updater.js");
	var entries = {};
	return {
		reqs:{router:false},
		init:function (ctx,cb) {
			cb(null, {
				api:{
					async: lxval.asyncValidate,
					register:function (id, obj) {
						var op = new updater(obj);
						entries[id] = entries[id] || {};
						op.update(entries[id]);
					},
					check:function (id, obj, opts, cb) {
						var valFn = function (data, schema, opts) {
							return lxval.validate(data, schema, opts);
						};
						if (!cb) {
							cb = opts;
							opts = {unknownProperties:"error"};
						}
						opts = _.defaults(opts, {unknownProperties:"error"});
						if (opts.isUpdate) {
							var op = new updater(obj);
							var sim = {};
							op.update(sim);
							obj = sim;
							valFn = lxval.getValidationFunction();
						}
						var schema = entries[id] || {};
						var res = valFn(obj, schema, opts);
						if (!res.valid) {
							safe.back(cb, new ValidationError(res));
						} else {
							safe.back(cb, null, obj);
						}
					}
				}
			});
		}
	};
};

module.exports.mongocache = function () {
	var entries = {};
	var safeKey = function (key) {
		var sKey = key.toString();
		if (sKey.length>512) {
			md5sum = crypto.createHash('md5');
			md5sum.update(sKey);
			sKey = md5sum.digest('hex');
		}
		return sKey;
	};
	return {
		reqs:{router:false},
		deps:["mongo"],
		init:function (ctx,cb) {
			ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
				cb(null, {
					api:{
						register:function (id, opts, cb) {
							if (id.indexOf("/")!=-1)
								return safe.back(cb,new Error("Found not allowed characters in cache id"));
							var col = entries["cache_"+id];
							if (col)
								return safe.back(cb,new Error("Cache "+id+" is already registered"));
							db.collection("cache_"+id, safe.sure(cb, function (col) {
								ctx.api.mongo.ensureIndex(col,{d:1},{expireAfterSeconds: opts.maxAge || 3600},safe.sure(cb, function () {
									entries["cache_"+id] = col;
									cb();
								}));
							}));
						},
						set:function (id,k,v,cb) {
							var col = entries["cache_"+id];
							if (!col) return safe.back(cb,new Error("Cache "+id+" is not registered"));
							col.update({_id:safeKey(k)},{$set:{d:new Date(),v:JSON.stringify(v)}},{upsert:true},cb);
						},
						get:function (id,k,cb) {
							var col = entries["cache_"+id];
							if (!col) return safe.back(cb,new Error("Cache "+id+" is not registered"));
							col.findOne({_id:safeKey(k)},safe.sure(cb, function (rec) {
								if (!rec)
									cb(null,null);
								else
									cb(null,JSON.parse(rec.v));
							}));
						},
						has:function (id,k,cb) {
							var col = entries["cache_"+id];
							if (!col) return safe.back(cb,new Error("Cache "+id+" is not registered"));
							col.find({_id:safeKey(k)}).limit(1).count(cb);
						},
						unset:function (id,k,cb) {
							var col = entries["cache_"+id];
							if (!col) return safe.back(cb,new Error("Cache "+id+" is not registered"));
							col.remove({_id:safeKey(k)},cb);
						},
						reset:function (id, cb) {
							var col = entries["cache_"+id];
							if (!col) return safe.back(cb,new Error("Cache "+id+" is not registered"));
							col.remove({},cb);
						}
					}
				});
			}));
		}
	};
};
