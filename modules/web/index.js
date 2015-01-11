var requirejs = require('requirejs');
var _ = require('lodash');
var safe = require('safe');
var dust = require('dustjs-linkedin');
var fs = require('fs');
var path = require('path');
var static = require('serve-static');

requirejs.config({
    baseUrl: __dirname+"/app",
    paths:{
		"tinybone":path.resolve(__dirname,"../tinybone")
	}
})

requirejs.define("dust",dust);

module.exports.init = function (ctx, cb) {
	ctx.router.use(static(__dirname));
	ctx.router.use(static(path.resolve(__dirname,"../.")));
	ctx.router.get("/app/dustjs/:path", function (req, res, next) {
		var name = req.params.path;
		name = name.replace(".js","");
		fs.readFile(path.resolve(__dirname, "./app/templates",name+".dust"), safe.sure(next, function (template) {
			res.send(dust.compile(template.toString(), name));
		}))
	})
	requirejs(['routes'], function (routes) {
		_.each(routes, function (v,k) {
			ctx.router.get(k,function (req,res,next) {
				requirejs(['routes/'+v,'app'],function (route,app) {
					route(safe.sure(next,function (route) {
						var view = app.getView();
						view.data = route.data || {};
						var populateTplCtx = view.populateTplCtx;
						view.populateTplCtx = function (ctx, cb) {
							ctx = ctx.push({_t_main_view:route.view});
							populateTplCtx.call(this,ctx,cb)
						}
						view.render(safe.sure(next, function (text) {
							res.send(text)
						}))
					}))
				},next)
			})
		})
		cb(null,{api:{}})
	},cb)
}
