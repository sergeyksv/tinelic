var newrelic = require('newrelic')
var tinyback = require('tinyback');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var _ = require("lodash");
var safe = require("safe");
var argv = require('yargs').argv;

var cfg = {
	modules:[
		{name:"prefixify",object:tinyback.prefixify()},
		{name:"validate",object:tinyback.validate()},
		{name:"mongo",object:tinyback.mongodb()},
		{name:"obac",object:tinyback.obac()},
		{name:"users",require:"./modules/usersapi.js"},
		{name:"restapi",object:tinyback.restapi()},
		{name:"assets",require:"./modules/assetsapi.js"},
		{name:"collect",require:"./modules/collectapi.js"},
		{name:"stats",require:"./modules/statsapi.js"},
		{name:"web",require:"./modules/web"}
	],
	config:require("./config.js")
}

var lcfgPath = argv.config || "./local-config.js";
if(fs.existsSync(lcfgPath)){
	cfg.config = _.merge(cfg.config,require(lcfgPath));
}

console.time("Live !")
tinyback.createApp(cfg, function (err, app) {
	if (err) {
		console.log(err);
		if (err.originalError)
			console.log(err.originalError);
		process.exit(0);
	}

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
					})
					func.apply(this,args)
				} else {
					func.apply(this,arguments)
				}
			}
		})
	})
	console.timeEnd("Live !")
	try {
		var options = {
			key: fs.readFileSync(path.resolve(__dirname + '/privatekey.pem'), 'utf8'),
			cert: fs.readFileSync(path.resolve(__dirname + '/certificate.pem'), 'utf8'),
			ssl: true,
			plain: false
		}

		var httpsServer = https.createServer(options, app.express);

		httpsServer.listen(443)
	} catch (e) {};

	var httpServer = http.createServer(app.express);

	httpServer.listen(80);

	if (cfg.config.automated && process.send) {
		process.send({c: "startapp_repl", data: err})
	}
})
