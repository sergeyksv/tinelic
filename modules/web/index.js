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
		"tinybone":path.resolve(__dirname,"../tinybone")
	}
})

requirejs.define("dust",dust);
requirejs.define("highcharts",true);

module.exports.deps = ['assets'];

module.exports.init = function (ctx, cb) {
	var self_id = null;
	requirejs.define("backctx",ctx);
	ctx.router.use("/css",lessMiddleware(__dirname + '/style',{dest:__dirname+"/public/css"}))
	ctx.router.use(static(__dirname+"/public"));
	ctx.router.get("/app/dustjs*", function (req, res, next) {
		var name = req.path.replace("/app/dustjs/","");
		name = name.replace("_tpl.js","");
		fs.readFile(path.resolve(__dirname, "./app/templates",name+".dust"), safe.sure(next, function (template) {
			res.set('Content-Type', 'application/javascript');
			res.send(dust.compile(template.toString(), name));
		}))
	})
	requirejs(['routes','app'], function (routes,App) {
		var app = new App({prefix:"/web"});
		_.each(routes, function (v,k) {
			ctx.router.get(k,function (req,res,next) {
				var rp = v.split("#");
				requirejs(['routes/'+rp[0]],function (route) {
					route[rp[1]](_.pick(req,["params","query"]), {
						render:function (route) {
							var view = app.getView();
							view.data = route.data || {};
							var populateTplCtx = view.populateTplCtx;
							view.populateTplCtx = function (ctx, cb) {
								ctx = ctx.push({_t_main_view:route.view,
									_t_prefix:"/web",
									_t_self_id:self_id,
									_t_start:(new Date()).valueOf(),
									_t_route:k
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

								res.send(text.replace("_t_app_wire",JSON.stringify(wv)))
							}))
						}
					},next)
				},next)
			})
		})
		ctx.api.assets.getProject("public",{slug:"tinelic"}, safe.sure(cb, function (selfProj) {
			if (selfProj==null) {
				ctx.api.assets.saveProject("public", {project:{name:"Tinelic"}}, safe.sure(cb, function (selfProj) {
					self_id = selfProj._id;
					cb(null,{api:{}})
				}))
			} else {
				self_id = selfProj._id;
				cb(null,{api:{}})
			}
		}))
	},cb)
}
