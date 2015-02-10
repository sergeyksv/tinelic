var requirejs = require('requirejs');
var _ = require('lodash');
var safe = require('safe');
var dust = require('dustjs-linkedin');
var fs = require('fs');
var path = require('path');
var static = require('serve-static');
var lessMiddleware = require('less-middleware');

requirejs.config({
    baseUrl: __dirname+"/app",
    paths:{
		"tinybone":path.resolve(__dirname,"../tinybone"),
		'dustc': path.resolve(__dirname,'../tinybone/dustc'),
		'text': path.resolve(__dirname,'../../node_modules/requirejs-text/text')
	},
	config:{
		"text":{
			env:"node"
		}
	}
})

requirejs.define("dust",dust);
requirejs.define("dust-helpers", require('dustjs-helpers'));

// server stubs
requirejs.define("jquery", true);
requirejs.define("jquery-cookie", true);
requirejs.define("bootstrap/dropdown", true);
requirejs.define("highcharts",true);

module.exports.deps = ['assets','users','collect'];

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
	requirejs(['routes','app'], function (routes,App) {
		var app = new App({prefix:"/web"});
		_.each(routes, function (v,k) {
			ctx.router.get(k,function (req,res,next) {
				var rp = v.split("#");
				requirejs(['routes/'+rp[0]],function (route) {
					route[rp[1]](_.pick(req,["params","query","cookies"]), {
						render:function (route) {
							var view = app.getView();
							view.data = route.data || {};
							var populateTplCtx = view.populateTplCtx;
							var uniqueId = _.uniqueId("w")
							view.populateTplCtx = function (ctx, cb) {
								ctx = ctx.push({_t_main_view:route.view.id,
									_t_prefix:"/web",
									_t_self_id:self_id,
									_t_route:k,
									_t_unique:uniqueId,
									_t_env_production:cfg.env=="production",
									_t_rev:cfg.rev
								});
								populateTplCtx.call(this,ctx,cb)
							}
							view.render(safe.sure(next, function (text) {
								var wv = {name:"app",data:route.data,views:[]};
								function wireView(realView,wiredView) {
									_.each(realView.views, function (view) {
										var wv = {name:view.name, data:view.data, cid:view.view.cid, views:[]};
										wireView(view.view,wv);
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
					},next)
				},next)
			})
		})
		ctx.api.assets.getProject("public",{filter:{slug:"tinelic-web"}}, safe.sure(cb, function (selfProj) {
			if (selfProj==null) {
				ctx.api.assets.saveProject("public", {project:{name:"Tinelic Web"}}, safe.sure(cb, function (selfProj_id) {
					self_id = selfProj_id;
					cb(null,{api:{}})
				}))
			} else {
				self_id = selfProj._id;
				cb(null,{api:{}})
			}
		}))
		ctx.api.users.getUser("public",{filter:{name:"admin"}}, safe.sure(cb, function (self) {
			if (self==null) {
				ctx.api.users.saveUser("public", {name:"admin", pass:'tinelic'},cb)
			}
			else {
				cb(null, self)
			}
		}))
	},cb)
}
