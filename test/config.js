module.exports = {
	env: 'production',
	automated: true,
	mongo: {
		main: {
			db: 'tinelic_test',
			host: process.env.CI ? 'mongo' : 'localhost'
		}
	},
	server: {
		port: 8080,
		ssl_port: false
	}
};
