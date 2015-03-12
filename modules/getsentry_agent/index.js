var url = require("url");
var fs = require("fs");
var safe = require("safe");
var _ = require("lodash");
var mongo = require("mongodb");
var zlib = require('zlib');
ErrorParser_GetsentryServer = require("../error_parser/parser_getsentry_server.js");

module.exports.deps = ['mongo'];

module.exports.init = function ( ctx, cb_main ) {
	ctx.api.mongo.getDb( {}, safe.sure( cb_main, function( db ) {
		
		function cb_error( error ) {
			_log_error( "GETSENTRY_SERVER ERROR: " + (error.stack ? error.stack : error) + "\n" );
		}

		safe.series( {
			projects_cache: function( cb ) {
				db.collection("projects").find({}).toArray( safe.sure( cb_error, function( projects_array ){
					var _projects = {};
					_.each( projects_array, function( _project ) {
						_projects[_project._id.toString()] = { 'id': _project._id, "name": _project.name };
					} );
					cb( null, _projects );
				} ) );
			}
		}, safe.sure( cb_error, function( tinelic_data ) {
			/* request from getsenty (server side)
				Note. Part of path "/api/store" is hard coded, other part "/getsentry" is defined in
				client application,
				e.g. dsn for getsentry is http://pushok_public_key:pushok_private_key@localhost/getsentry/12345
				where 12345 is project id
			*/
			ctx.express.post( "/getsentry/api/store", function( req, res ) {
				safe.run( function() {
					// getsentry passes base64 encoded zipped buffer
					var zip_buffer = new Buffer( req.body.toString(), 'base64' );
					zlib.inflate( zip_buffer, safe.sure( cb_error, function( _buffer_getsentry_data ) {
						var getsentry_data = JSON.parse( _buffer_getsentry_data.toString() );
						on_agent_request( res, req.url, getsentry_data, tinelic_data );
					} ) );
					res.status( 200 ).end( "ok" );
				}, function( error ){
					cb_error( error );
					safe.run( function(){
						// return server error to newrelic
						res.writeHead( 500, { 'x-sentry-error': error.toString() } );
						res.status( 500 ).end( error.toString() );
					}, cb_error );
				} );
			} );
		} ));

		function on_agent_request( res, request_url, request_data_json, tinelic_data ) {
			// verify project
			if( !tinelic_data.projects_cache[request_data_json.project.toString()] )
				throw new Error( "Project with id \"" + request_data_json.project.toString() + "\" not found" );
			// parse and add error
			var error_parser = new ErrorParser_GetsentryServer();
			error_parser.add_error( db, new mongo.ObjectID(request_data_json.project.toString()), request_data_json, safe.sure( cb_error, function( error_data ) {
				db.collection("actions_errors").insert( error_data, safe.sure( cb_error, function( records ){
					// TODO
				} ) );
			} ) );
		}

		function _log_error( data ) {
			_log( data );
			fs.appendFile( "server_getsentry_error.log", data );
			fs.appendFile( "server_getsentry_error.log", "\n" );
			console.log( data );
		}

		function _log( data ) {
			/*
			fs.appendFile( "server_getsentry.log", data );
			fs.appendFile( "server_getsentry.log", "\n" );
			*/
		}
		
		function _replace( str, from, to ) {
			while( str.indexOf(from) >= 0 )
				str = str.replace( from, to );
			return str;
		}

		cb_main( null, {} );
	} )
	);
}
