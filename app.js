require('newrelic')
var tinyback = require('tinyback');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var _ = require("lodash");

var cfg = {
	modules:[
		{name:"prefixify",object:tinyback.prefixify()},
		{name:"validate",object:tinyback.validate()},
		{name:"mongo",object:tinyback.mongodb()},
		{name:"obac",object:tinyback.obac()},
		{name:"users",require:"./modules/usersapi.js"},
		{name:"restapi",object:tinyback.restapi()},
		{name:"assets",require:"./modules/assetsapi.js"},
		{name:"collect",require:"./modules/collectapi.js"},
		{name:"stats",require:"./modules/statsapi.js"},
		{name:"web",require:"./modules/web"}
	],
	config:require("./config.js")
}

var lcfgPath = "./local-config.js";
if(fs.existsSync(lcfgPath)){
	cfg.config = _.merge(cfg.config,require(lcfgPath));
}

console.time("Live !")
tinyback.createApp(cfg, function (err, app) {
	console.timeEnd("Live !")
	if (err) {
		console.log(err.stack);
		if (err.originalError)
			console.log(err.originalError.stack);
		process.exit(0);
	}
	try {
		var options = {
			key: fs.readFileSync(path.resolve(__dirname + '/privatekey.pem'), 'utf8'),
			cert: fs.readFileSync(path.resolve(__dirname + '/certificate.pem'), 'utf8'),
			ssl: true,
			plain: false
		}

		var httpsServer = https.createServer(options, app.express);

		httpsServer.listen(443)
	} catch (e) {};

	var httpServer = http.createServer(app.express);

	httpServer.listen(80);
})
