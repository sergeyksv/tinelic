'use strict';
module.exports = {
	env: 'production',
	app: {
		wrapErrors: 1
	},
	restapi: {
		modules: {
			_t_registry: 1,
			prefixify: 1,
			tson: 1,
			validate: 1,
			mongo: 1,
			obac: 1,
			restapi: 1,
			cache: 1,
			stats: 1,
			users: 1,
			assets: 1,
			collect: 1,
			agent_listener: 1,
			web: 1
		}
	},
	mongo: {
		main: {
			// url: 'mongodb://localhost:27017/tinelic',
			db: 'tinelic',
			host: 'localhost',
			port: 27017,
			scfg: { auto_reconnect: true, poolSize: 100 },
			ccfg: { native_parser: true, w: 1 }
		}
	},
	server: {
		port: 80,
		ssl_port: false
	}
};
