'use strict';
module.exports = {
	env: 'development',
	app: {
		wrapErrors: 1,
		cleanInterval: 3600000,		// 1 hour, set zero of false to avoid clean
		cleanRetention: 604800000	// data will be kep for 1 week 604800000 = 1000 * 60 * 60 * 24 * 7
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
	/**
	 * config for dumping
	dump: {
		start: '2019-06-10T10:00:00.000',
		end:'2019-06-10T10:10:00.000',
		host: 'localhost', // optional
		port: '27017', // optional
		db: 'tinelic',
		out: `${__dirname}/tmp/dump/`,
		authenticationDatabase: 'admin', // optional
		username: null, // optional
		password: null // optional
	},
	*/
	server: {
		host: 'localhost',
		port: 80,
		ssl_port: false
	}
};
