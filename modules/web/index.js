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

// Make sure dust.helpers is an object before adding a new helper.
if (!dust.helpers)
    dust.helpers = {};

var app = {
	loadTemplates: function (names, cb) {
		safe.each(names, function (name, cb) {
			fs.readFile(path.resolve(__dirname, "./app/templates",name+".dust"), safe.sure(cb, function (template) {
				dust.loadSource(dust.compile(template.toString(), name));
				cb();
			}))
		},cb);
	}
}

dust.helpers.view = function(chunk, context, bodies, params) {
    return chunk.map(function(chunk) {
		requirejs(['views/'+params.name], function (View) {
			var view = new View(app);
			app.loadTemplates(view.tpls?view.tpls:[params.name], function () {
				view.render(function (err,text) {
					chunk.end(text);
				})
			})
		})
    });
};

dust.config.whitespace = true;

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
				requirejs(['routes/'+v],function (route) {
					route.data(safe.sure(next,function (data) {
						app.loadTemplates(['layout'], safe.sure(next, function () {
							dust.render('layout',data, safe.sure(next, function (text) {
								res.send(text)
							}))
						}))
					}))
				},next)
			})
		})
		cb(null,{api:{}})
	},cb)
}
