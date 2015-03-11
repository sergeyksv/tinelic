var newrelic_agent = require('newrelic')
var safe = require('safe')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var mongo = require("mongodb")

// Set up Raven
var dsn = 'http://pushok_public_key:pushok_private_key@localhost/getsentry/54b804ad537f8a143b397b7e';
var raven = require('raven');
var getsentry_client = new raven.Client(dsn);

// Express
var express = require('express');
var app = express();

// Request middlewares
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(raven.middleware.express(getsentry_client));

function cb_error( error ) {
	console.log( "STATISTICS ERROR: " + (error["stack"] ? error["stack"] : error) );
}

app.get('/rtest', function(req, res) {
	res.status(200).end( "ok" );
} );

app.get('/etest', function(req, res) {
	safe.run( function() {
		throw new Error("Undexpected Error 1");
		res.status( 200 ).end( "ok" );
	}, function( error ) {
		getsentry_client.captureError( error );
		newrelic_agent.noticeError( error );
		res.status( 500 ).end( "an error occurred: " + error );
	} );
} );


var app_port = 3000;
app.listen( app_port );
console.log( "Listening on port " + app_port );
console.log( "" );
console.log( "http://localhost:" + app_port + "/rtest - generates newrelic generic statistics" );
console.log( "http://localhost:" + app_port + "/etest - generates newrelic & getsentry server error statistics" );

