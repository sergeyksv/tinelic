module.exports = {
	env:"dev",
	mongo:{
		main:{
			db: (process.argv[2] == "automated")?"tqa":"tinelic",
			host:"localhost",
			port:27017,
			scfg:{auto_reconnect: true, poolSize : 40},
			ccfg:{native_parser: false, safe: true, w:1}
		}
	}
};
