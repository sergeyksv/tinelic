module.exports = {
	env:"test",
	automated:true,
	mongo:{
		main:{
			db: "tinelic_test",
		}
	},
	server:{
		port:3000,
		ssl_port:false
	}
};
