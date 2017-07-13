var argv = require('yargs').argv;
var fs = require('fs');
var _ = require("lodash");
var cfg = {
	config:require("./config.js")
};
var lcfgPath = argv.config || "./local-config.js";
if (fs.existsSync(lcfgPath)) {
	cfg.config = _.merge(cfg.config, require(lcfgPath));
}
// eslint-disable-next-line no-process-env
process.env['NEW_RELIC_PORT'] = cfg.config.server.port;

var newrelic = require('newrelic');
var tinyback = require('tinyback');
var http = require('http');
var https = require('https');
var path = require('path');
var safe = require("safe");

_.merge(cfg, {
	modules:[
		{name:"prefixify",object:tinyback.prefixify()},
		{name:"tson",object:tinyback.tson()},
		{name:"validate",object:tinyback.validate()},
		{name:"mongo",object:tinyback.mongodb()},
		{name:"cache",object:tinyback.mongocache()},
		{name:"obac",object:tinyback.obac()},
		{name:"users",require:"./modules/usersapi.js"},
		{name:"restapi",object:tinyback.restapi()},
		{name:"assets",require:"./modules/assetsapi.js"},
		{name:"collect",require:"./modules/collectapi.js"},
		{name:"stats",require:"./modules/statsapi.js"},
		{name:"web",require:"./modules/web"}
	],
});

console.time("Live !");
var cb = function (err) {
	console.trace(err);

	if (err.originalError)
		console.trace(err.originalError);

	process.exit(0);
};

tinyback.createApp(cfg, safe.sure(cb, function (app) {
	app.api.mongo.getDb({}, safe.sure(cb, function (db) {
		app.api.mongo.dropUnusedIndexes(db, safe.sure(cb, function () {
			app.locals.newrelic = newrelic;
			_.each(app.api, function (module, ns) {
				_.each(module, function (func, name) {
					if (!_.isFunction(func)) return;
					// wrap function
					module[name] = function () {
						var cb = arguments[arguments.length-1];
						if (_.isFunction(cb)) {
							var args = safe.args.apply(0, arguments);
							// redefined callback to one wrapped by new relic
							args[args.length-1] = newrelic.createTracer("api/api/"+ns+"/"+name, function (err) {
								if (err)
									newrelic.noticeError(err);
								cb.apply(this, arguments);
							});
							func.apply(this,args);
						} else {
							return func.apply(this,arguments);
						}
					};
				});
			});
			console.timeEnd("Live !");
			if (cfg.config.server.ssl_port) {
				try {
					var options = {
						key: fs.readFileSync(path.resolve(__dirname + '/privatekey.pem'), 'utf8'),
						cert: fs.readFileSync(path.resolve(__dirname + '/certificate.pem'), 'utf8'),
						ssl: true,
						plain: false
					};

					var httpsServer = https.createServer(options, app.express);

					httpsServer.listen(cfg.config.server.ssl_port);
				} catch (e) {}
			}

			var httpServer = http.createServer(app.express);

			httpServer.listen(cfg.config.server.port);

			if (cfg.config.automated && process.send) {
				process.send({c: "startapp_repl", data: null});
			}
		}));
	}));
}));
