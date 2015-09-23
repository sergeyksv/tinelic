var requirejs = require('requirejs');
var _ = require('lodash');
var safe = require('safe');
var dust = require('dustjs-linkedin');
var fs = require('fs');
var path = require('path');
var static = require('serve-static');
var lessMiddleware = require('less-middleware');
var raven = require('raven');


module.exports.deps = ['assets','users','collect','stats'];

module.exports.init = function (ctx, cb) {
	var self_id = null;
	var cfg = ctx.cfg;

	var reqctx = requirejs.config({
		baseUrl: __dirname+"/app",
		paths:{
			"tson":path.resolve(__dirname,"../tinyback/tson"),
			"prefixify":path.resolve(__dirname,"../tinyback/prefixify"),
			"tinybone":path.resolve(__dirname,"../tinybone"),
			'dust.core': path.resolve(__dirname, '../../node_modules/dustjs-linkedin/lib/dust'),
			'dust.parse': path.resolve(__dirname, '../../node_modules/dustjs-linkedin/lib/parser'),
			'dust.compile': path.resolve(__dirname, '../../node_modules/dustjs-linkedin/lib/compiler'),
			'dust-helpers': path.resolve(__dirname, '../../node_modules/dustjs-helpers/lib/dust-helpers'),
			'dustc': path.resolve(__dirname,'../tinybone/dustc'),
			'text': path.resolve(__dirname,'../../node_modules/requirejs-text/text'),
			"md5":"../public/js/md5",
			'jquery.tablesorter.combined': path.resolve(__dirname,'../../node_modules/tablesorter/dist/js/jquery.tablesorter.combined'),
		},
		config:{
			"text":{
				env:"node"
			},
			"tinybone/base":{
				debug:cfg.env!="production"
			},
			"dustc":{
				debug:cfg.env!="production"
			},
			"tinybone/backadapter":{
				_t_son:"out",
				debug:cfg.env!="production"
			}
		}
	});

	requirejs.onError = function (err) {
		console.log(err.trace);
	};

	// server stubs
    requirejs.define.amd.dust = true;
	requirejs.define("jquery", true);
	requirejs.define("jquery-cookie", true);
	requirejs.define("jquery.blockUI", true);
	requirejs.define("bootstrap/dropdown", true);
    requirejs.define("bootstrap/datetimepicker", true);
	requirejs.define("bootstrap/modal", true);
	requirejs.define("bootstrap/tagsinput", true);
	requirejs.define("bootstrap/typeahead", true);
    requirejs.define("bootstrap/collapse", true);
    requirejs.define("bootstrap/transition", true);
	requirejs.define("highcharts",true);
	requirejs.define("jquery.tablesorter.combined",true);
	requirejs.define("backctx",ctx);

	ctx.router.use("/css",lessMiddleware(__dirname + '/style',{dest:__dirname+"/public/css"}));
	ctx.router.use(static(__dirname+"/public",{maxAge:600000}));
	ctx.router.get("/app/wire/:id", function (req, res, next) {
		ctx.api.cache.get("web_wires",req.params.id, safe.sure(next, function (wire) {
			if (wire) {
				res.json(wire);
			} else
				res.send(404);
		}));
	});
	reqctx(['app'], function (App) {
		var app = new App({prefix:"/web"});
		// reuse express router as is
		app.router = ctx.router;
		// register render function
		ctx.router.get('*',function (req,res,next) {
			res.renderX = function (route) {
				var req = this.req;
				cb = cb || function (err) {
					req.next(err);
				};
				var view = app.getView();
				view.data = route.data || {};
				view.locals = res.locals;
				var populateTplCtx = view.populateTplCtx;
				var uniqueId = _.uniqueId("w");
				view.populateTplCtx = function (ctx, cb) {
					ctx = ctx.push({_t_main_view:route.view.id,
						_t_prefix:"/web",
						_t_self_id:self_id,
						_t_route:res.req.route.path,
						_t_unique:uniqueId,
						_t_env_production:cfg.env=="production",
						_t_rev:cfg.rev
					});
					populateTplCtx.call(this,ctx,cb);
				};

				view.render(safe.sure(cb, function (text) {
					var wv = view.getWire();
					wv.prefix = app.prefix;

					// make wire available for download for 30s
					ctx.api.cache.set("web_wires",uniqueId,ctx.api.tson.encode(wv), safe.sure(cb, function () {
						res.send(text);
					}));
				}));
			};
			next();
		});
		var _idadmin;
		safe.series([
			function (cb) {
				ctx.api.cache.register("web_wires",{maxAge:300},cb);
			},
			function (cb) {
				app.initRoutes(cb);
			},
			function (cb) {
				ctx.api.assets.getProject(ctx.locals.systoken,{filter:{slug:"tinelic-web"}}, safe.sure(cb, function (selfProj) {
					if (!selfProj) {
						ctx.api.assets.saveProject(ctx.locals.systoken, {project:{name:"Tinelic Web"}}, safe.sure(cb, function (proj) {
							self_id = proj._id;
							cb();
						}));
					} else {
						self_id = selfProj._id;
						cb();
					}
				}));
			},
			function (cb) {
				ctx.api.users.getUser(ctx.locals.systoken,{filter:{login:"admin"}}, safe.sure(cb, function (admin) {
					if (admin) {
						_idamin = admin._id;
						return cb();
					}

					ctx.api.users.saveUser(ctx.locals.systoken, {login:"admin",firstname: 'Tinelic', lastname: 'Admin', role: 'admin', pass: "tinelic"},safe.sure(cb, function (admin) {
						_idadmin=admin._id;
						cb();
					}));
				}));
			},
			function (cb) {
				ctx.api.assets.getTeam(ctx.locals.systoken,{filter:{name:"Tinelic"}}, safe.sure(cb, function (team) {
					if (team) return cb();
					ctx.api.assets.saveTeam(ctx.locals.systoken, {team:{name:"Tinelic"}},safe.sure(cb, function (team) {
						ctx.api.assets.saveTeamUsersForRole(ctx.locals.systtoken,{_id:team._id, _s_type:'lead', users:[{_idu:_idadmin}]}, safe.sure(cb, function() {
							ctx.api.assets.saveTeamProjects(ctx.locals.systtoken,{_id:team._id, projects:[{_idp:self_id}]},cb);
						}));
					}));
				}));
			}
		], safe.sure(cb, function () {
			// Set up Raven
			ctx.locals.ravenjs = new raven.Client('http://blah:blah@localhost/collect/sentry/'+self_id);
			setTimeout(function () {
				ctx.locals.ravenjs.captureError(new Error("Tinelic Sentry startup!"));
			}, 1000);
			require("newrelic").noticeError( new Error("Tinelic NewRelic startup!"));

			cb(null,{api:{
				getFeed:function (token, p, cb) {
					if (ctx.locals.newrelic)
						ctx.locals.newrelic.setTransactionName("/webapi/"+(token=="public"?"public":"token")+"/feed/"+p.feed);
					feed = p.feed.split(".");
					reqctx(["feed/"+feed[0]], function (m) {
						m[feed[1]](token,p.params,cb);
					},cb);
				}
			}});
		}));
	},cb);
};
