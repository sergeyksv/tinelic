module.exports = {
	env:"dev",
	mongo:{
		main:{
			db: "tinelic",
			host:"errbit.pushok.com",
			port:27017,
			scfg:{auto_reconnect: true, poolSize : 100},
			ccfg:{native_parser: true, w:1}
		}
	}
};
