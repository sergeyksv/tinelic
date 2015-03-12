var requirejs = require('requirejs');
var _ = require('lodash');
var safe = require('safe');
var dust = require('dustjs-linkedin');
var fs = require('fs');
var path = require('path');
var static = require('serve-static');
var lessMiddleware = require('less-middleware');
var raven = require('raven');

requirejs.config({
    baseUrl: __dirname+"/app",
    paths:{
		"tinybone":path.resolve(__dirname,"../tinybone"),
		'dustc': path.resolve(__dirname,'../tinybone/dustc'),
		'text': path.resolve(__dirname,'../../node_modules/requirejs-text/text'),
		"md5":"../public/js/md5",
	},
	config:{
		"text":{
			env:"node"
		}
	}
})

requirejs.onError = function (err) {
	console.log(err.trace);
}

requirejs.define("dust",dust);
requirejs.define("dust-helpers", require('dustjs-helpers'));

// server stubs
requirejs.define("jquery", true);
requirejs.define("jquery-cookie", true);
requirejs.define("bootstrap/dropdown", true);
requirejs.define("bootstrap/modal", true);
requirejs.define("highcharts",true);

module.exports.deps = ['assets','users','collect',"newrelic_server","getsentry_server"];

var wires = {};

module.exports.init = function (ctx, cb) {
	var self_id = null;
	var cfg = ctx.cfg;
	requirejs.define("backctx",ctx);
	ctx.router.use("/css",lessMiddleware(__dirname + '/style',{dest:__dirname+"/public/css"}))
	ctx.router.use(static(__dirname+"/public"));
	ctx.router.get("/app/wire/:id", function (req, res, next) {

		var wire = wires[req.params.id];
		if (wire) {
			delete wires[req.params.id];
			res.json(wire);
		} else
			res.send(404)
	})
	requirejs(['app'], function (App) {
		var app = new App({prefix:"/web"});
		// reuse express router as is
		app.router = ctx.router;
		// register render function
		ctx.router.get('*',function (req,res,next) {
			res.renderX = function (route) {
				var view = app.getView();
				view.data = route.data || {};
				view.locals = res.locals;
				var populateTplCtx = view.populateTplCtx;
				var uniqueId = _.uniqueId("w")
				view.populateTplCtx = function (ctx, cb) {
					ctx = ctx.push({_t_main_view:route.view.id,
						_t_prefix:"/web",
						_t_self_id:self_id,
						_t_route:res.req.route.path,
						_t_unique:uniqueId,
						_t_env_production:cfg.env=="production",
						_t_rev:cfg.rev
					});
					populateTplCtx.call(this,ctx,cb)
				}

				view.render(safe.sure(next, function (text) {
					var wv = {name:"app",data:route.data,views:[]};
					function wireView(realView, wiredView) {
						_.each(realView.views, function (view) {
							var wv = {md5:view.md5, name:view.constructor.id, data:view.dataPath, cid:view.cid, views:[]};
							wireView(view,wv);
							wiredView.views.push(wv)
						})
					}
					wv.prefix = app.prefix;

					wireView(view,wv);
					// make wire available for download for 30s
					wires[uniqueId]=wv;
					setTimeout(function () {
						delete wires[uniqueId]
					}, 30000);

					res.send(text)
				}))
			}
			next();
		})
		var usr_admin=[{}], proj_Def=[{}];
		safe.series([
			function (cb) {
				app.initRoutes(cb)
			},
			function (cb) {
				ctx.api.assets.getProject("public",{filter:{slug:"tinelic-web"}}, safe.sure(cb, function (selfProj) {
					if (selfProj==null) {
						ctx.api.assets.saveProject("public", {project:{name:"Tinelic Web"}}, safe.sure(cb, function (selfProj_id, name, slug) {
							proj_Def[0]._idp=selfProj_id;
							self_id = selfProj_id;
							cb()
						}))
					} else {
						self_id = selfProj._id;
						cb()
					}
				}))
			},
			function (cb) {
				ctx.api.users.getUser("public",{filter:{login:"admin"}}, safe.sure(cb, function (self) {
					if (self) return cb()

					ctx.api.users.saveUser("public", {login:"admin",firstname: 'user', lastname: 'default', role: 'admin', pass: "tinelic"},safe.sure(cb, function (self) {
						usr_admin[0]._idu=self[0]._id;
						usr_admin[0].role="lead";
					cb()
					}))
				}))
			},
			function (cb) {
				ctx.api.assets.getTeam("public",{filter:{name:"Tinelic"}}, safe.sure(cb, function (self) {
					if (self) return cb()
					ctx.api.assets.saveTeam("public", {name:"Tinelic", projects:proj_Def, users:usr_admin},cb)
				}))
			}
		], safe.sure(cb, function () {
			// Set up Raven
			var ravenjs = new raven.Client('http://pushok_public_key:pushok_private_key@localhost/getsentry/'+self_id);
			ravenjs.captureError(new Error("Tinelic Sentry startup!"));
			require("newrelic").noticeError( new Error("Tinelic NewRelic startup!"));

			cb(null,{api:{
				getFeed:function (token, p, cb) {
					feed = p.feed.split(".")
					requirejs(["feed/"+feed[0]], function (m) {
						m[feed[1]](token,p.params,cb)
					},cb)
				}
			}})
		}))
	},cb)
}
