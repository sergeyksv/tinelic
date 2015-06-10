module.exports = {
	env:"test",
	automated:true,
	mongo:{
		main:{
			db: "tinelic_test",
		}
	},
	server:{
		port:8080,
		ssl_port:false
	}
};
