const newrelic = require('newrelic'),
	{ argv } = require('yargs'),
	fs = require('fs'),
	_ = require('lodash'),
	tinyback = require('tinyback'),
	http = require('http'),
	https = require('https'),
	path = require('path'),
	safe = require('safe');

let cfg = {
	config: require('./config.js')
};

const lcfgPath = argv.config || './local-config.js';
if (fs.existsSync(lcfgPath))
	cfg.config = _.defaultsDeep(require(lcfgPath), cfg.config);

process.env['NEW_RELIC_PORT'] = cfg.config.server.port;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

_.merge(cfg, {
	modules: [
		{ name: 'prefixify', object: tinyback.prefixify() },
		{ name: 'tson', object: tinyback.tson() },
		{ name: 'validate', object: tinyback.validate() },
		{ name: 'mongo', object: tinyback.mongodb() },
		{ name: 'cache', object: tinyback.mongocache() },
		{ name: 'obac', object: tinyback.obac() },
		{ name: 'users', require: './modules/usersapi.js' },
		{ name: 'restapi', object: tinyback.restapi() },
		{ name: 'assets', require: './modules/assetsapi.js' },
		{ name: 'collect', require: './modules/collect.js' },
		{ name: 'agent_listener', require: './modules/agent_listener.js' },
		{ name: 'stats', require: './modules/stats.js' },
		{ name: 'web', require: './modules/web' }
	]
});

cfg.defaults = {
	module: {
		reqs: {
			router: true,
			globalUse: true
		}
	},
	prefixify: {legacyBoolean: true},
	obac: {
		registerStillSync: true
	}
};

console.time('Live !');
var cb = function (err) {
	console.log(err);

	if (err.originalError)
		console.log(err.originalError);

	process.exit(0);
};

tinyback.createApp(cfg, safe.sure(cb, function (app) {
	app.api.mongo.getDb({}, safe.sure(cb, function (db) {
		app.api.mongo.dropUnusedIndexes(db, safe.sure(cb, function () {
			app.locals.newrelic = newrelic;
			_.each(app.api, function (mod, ns) {
				_.each(mod, function (func, name) {
					if (!_.isFunction(func)) return;
					// wrap function
					mod[name] = function (...args) {
						if (!_.isFunction(_.last(args))) return func.call(this, ...args);
						const cb = args.pop();

						const callback = function (err, ...args2) {
							if (err)
								newrelic.noticeError(err);
							cb.call(this, err, ...args2);
						};

						newrelic.startSegment(`api/api/${ns}/${name}`, true, cb => {
							func.call(this, ...args, cb);
						}, callback);
					};
				});
			});
			console.timeEnd('Live !');
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
				} catch (e) { console.error(e); }
			}

			var httpServer = http.createServer(app.express);

			httpServer.listen(cfg.config.server.port);

			if (cfg.config.automated && process.send) {
				process.send({ c: 'startapp_repl', data: null });
			}
		}));
	}));
}));
