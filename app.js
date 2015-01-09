var tinyback = require('tinyback');

var cfg = {
	modules:[
		{name:"mongo",object:tinyback.mongodb()},
		{name:"sentry",require:"./modules/sentryapi.js"},
		{name:"web",require:"./modules/web"}
	],
	config:{
		mongo:{
			main:{
				db:"tinelic",
				host:"localhost",
				port:27017,
				scfg:{auto_reconnect: true, poolSize : 40},
				ccfg:{native_parser: false, safe: true, w:1}
			}
		}
	}
}

tinyback.createApp(cfg, function (err, app) {
	if (err) {
		console.log(err.stack);
		process.exit(0);
	}
	app.express.listen(3000);
})
