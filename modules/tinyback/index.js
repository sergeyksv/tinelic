var _ = require("lodash")
var safe = require("safe")
var path = require("path");
var express = require('express');
var moment = require('moment');

module.exports.createApp = function (cfg, cb) {
	var app = express();
	var api = {};
	var auto = {};
	var registered = {};
	var requested = {};
	_.each(cfg.modules, function (module) {
		console.log("loading "+module.name);
		registered[module.name]=1;
		var mod = module.object || null;
		if (module.require) {
			var mpath = module.require;
			if (mpath.charAt(0)==".")
				mpath = path.resolve(path.dirname(require.main.filename),mpath);
			mod = require(mpath);
		}
		if (!mod)
			return cb(new Error("Can't not load module " + module.name))
		var args = _.clone(module.deps || []);
		args = _.union(mod.deps || [],args);
		_.each(args, function (m) {
			requested[m]=1;
		})
		args.push(function (cb) {
			var router = express.Router();
			app.use("/"+module.name,router)
			mod.init({api:api,cfg:cfg.config,app:this,express:app,router:router}, safe.sure(cb, function (mobj) {
				api[module.name]=mobj.api;
				cb();
			}))
		})
		auto[module.name]=args;
	});
	var missing = _.difference(_.keys(requested),_.keys(registered));
	if (missing.length)
		return safe.back(cb, new Error("Missing module dependancies: " + missing.join(',')))
	safe.auto(auto, safe.sure(cb, function () {
		console.log("-> ready");
		cb(null, {express:app})
	}))
}

module.exports.restapi = function () {
	return {
		init: function (ctx, cb) {
			ctx.router.use("/:token/:module/:target",function (req, res, next) {
				if (!ctx.api[req.params.module])
					throw new Error("No api module available");
				if (!ctx.api[req.params.module][req.params.target])
					throw new Error("No function available");

				ctx.api[req.params.module][req.params.target](req.params.token, req.query, safe.sure(next, function (result) {
					res.json(result);
				}))
			})
			cb(null, {
				api: {
				}
			})
		}
	}
}

module.exports.prefixify = function () {
	var translate = {
		"_i_": function (pr) {
			if (!isNaN(parseInt(pr)))
				return parseInt(pr);
		},
		"_s_": function (pr) {
			return pr.toString();
		},
		"_f_": function (pr) {
			if (!isNaN(parseFloat(pr)))
				return parseFloat(pr);
		},
		"_t_": function (pr) {
		},
		"_dt": function (pr) {
			if (pr) {
				var t = moment(pr);
				if (t.isValid())
					return t.toDate();
			}
		},
		"_b_": function (pr) {
			if (_.contains([true,"true",1,"1"], pr))
				return 1;
			if (_.contains([false,"false",0,"0",null,"null",""], pr))
				return 0;
		}
	}

	function datafix(obj,opts) {
		var nobj = obj;
		_.each(obj, function (v, k) {
			if (_.isFunction(v))
				return;

			var prefix = null;
			if (k.length > 2 && k[0] == "_")
				prefix = k.substr(0,3);

			if (prefix && translate[prefix]) {
				var nv = undefined;
				try { nv = translate[prefix](v); } catch (e) {};
				if (_.isUndefined(nv)) {
					if (opts && opts.strict)
						throw new Error("Wrong field format: "+k)
					delete nobj[k];
				} else if (nv!==v)
					nobj[k] = nv;
			} else if (_.isObject(v) || _.isArray(v)) {
				datafix(v,opts);
			}
		});
		return nobj;
	}

	return {
		init:function (ctx,cb) {
			cb(null, {
				api:{
					datafix:datafix,
					register:function (prefix, transform) {
						translate[prefix]=transform;
					}
				}
			})
		}
	}
}

module.exports.mongodb = function () {
	return {
		init:function (ctx,cb) {
			var mongo = require("mongodb");
			ctx.api.prefixify.register("_id",function (pr) {
				return new mongo.ObjectID(pr.toString());
			})

			var dbcache = {};
			cb(null, {
				api:{
					getDb:function (prm,cb) {
						var name = prm.name || "main";
						if (dbcache[name])
							safe.back(cb,null,dbcache[name]);
						var cfg = ctx.cfg.mongo[name];
						if (!cfg)
							safe.back(cb, new Error("No mongodb database for alias "+name))

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
							cb(null,db)
						}))
					}
				}
			})
		}
	}
}