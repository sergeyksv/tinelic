require('newrelic')
var tinyback = require('tinyback');

var cfg = {
	modules:[
		{name:"prefixify",object:tinyback.prefixify()},
		{name:"mongo",object:tinyback.mongodb()},
		{name:"restapi",object:tinyback.restapi()},
		{name:"assets",require:"./modules/assetsapi.js"},
		{name:"collect",require:"./modules/collectapi.js"},
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
