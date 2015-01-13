var _ = require("lodash")
var safe = require("safe")
var path = require("path");
var express = require('express');

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

module.exports.mongodb = function () {
	return {
		init:function (ctx,cb) {
			var mongo = require("mongodb");
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
