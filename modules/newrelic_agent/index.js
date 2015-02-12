var url = require("url");
var fs = require("fs");
var safe = require("safe");
var _ = require("lodash");
var mongo = require("mongodb");

module.exports.deps = ['mongo'];

module.exports.init = function ( ctx, cb ) {
	ctx.api.mongo.getDb( {}, safe.sure( cb, function( db ) {

		ctx.express.post( "/agent_listener/invoke_raw_method", function( req, res ) {
			var request_data = "";
			var request_url = req.url;
			req.on( "data", function( data ) {
				request_data += data;
			} );
			req.on( "end", function() {
				on_agent_request( res, request_url, request_data );
			} );
		} );

		function on_agent_request( res, request_url, request_data ) {
			try{
				var query = url.parse( request_url, true ).query;
				if( query.method == "get_redirect_host" ) {
					res.status( 200 ).end( JSON.stringify( { return_value: "localhost:80" } ) );
				} else if( query.method == "connect" ) {
					// agent passes it's environment and part of configurations as array [{%agent_info%}]
					// just get first item from arrray
					var agent_info = JSON.parse( request_data );
					agent_info = agent_info[0];
					// app_name is also array, get first item
					var agent_name = agent_info.app_name[0];
					_prepare_2_db( agent_info );
					// insert agent into database
					db.collection("newrelic_agents").find( {"agent": agent_name} ).toArray( function( error, agents_arr ) {
						if( error ) console.log("failed to search newrelic agent by name in database: " + error);
						else if( agents_arr.length == 0) {
							db.collection("newrelic_agents").insert( {"agent": agent_name, "environment": agent_info}, function(error, records){
								if( error ) console.log( "failed to insert newrelic agent into database: " + error );
								else res.status( 200 ).end( JSON.stringify( { return_value: {"agent_run_id": records[0]._id} } ) );
							} )
						} else {
							db.collection("newrelic_agents").update( agents_arr[0], {$set: {"environment": agent_info}}, function(error){
								if( error ) console.log( "failed to update newrelic agent in database: " + error );
								else res.status( 200 ).end( JSON.stringify( { return_value: {"agent_run_id": agents_arr[0]._id} } ) );
							} )
						}
					} );
				} else if( query.method == "agent_settings" ) {
					var agent_configurations = JSON.parse(request_data);
					_prepare_2_db( agent_configurations );
					var agent_id = query["run_id"];
					if( !agent_id ) console.log( "invalid request \"agent_settings\", run_id is undefined" ); 
					else {
						db.collection("newrelic_agents").find( {"_id": new mongo.ObjectID(agent_id)} ).toArray( function( error, agents_arr ) {
							if( error ) console.log("newrelic settings came, failed to search newrelic agent by id in database: " + error);
							else if( agents_arr.length > 0 ) {
								db.collection("newrelic_agents").update( agents_arr[0], {$set: {"configurations": agent_configurations}}, {"upsert": true}, function(error){
									if( error ) console.log( "failed to update newrelic agent in database: " + error );
									else res.status( 200 ).end( request_data );
								} )
							} else console.log( "failed to verify agent settings: newrelic agent with id " + agent_id + " not found" );
						} );
					}
				} else {
					var metric_methods = { "error_data": 1, "metric_data": 1, "transaction_sample_data": 1, "sql_trace_data": 1, "shutdown": 1, "analytic_event_data": 1 };
					if( query.method && metric_methods[query.method] ) {
						var metric_data = JSON.parse(request_data);
						_prepare_2_db( metric_data );
						var agent_id = query["run_id"];
						if( !agent_id ) console.log( "invalid request \"" + query.method + "\", run_id is undefined" ); 
						else {
							db.collection("newrelic_agents").find( {"_id": new mongo.ObjectID(agent_id)} ).toArray( function( error, agents_arr ) {
								if( error ) console.log("newrelic metric data came, failed to search agent by id in database: " + error);
								else if( agents_arr.length > 0 ) {
									db.collection("newrelic_agent_metcirs").insert( {"agent_id": agents_arr[0]._id, "metric": query.method, "data": metric_data}, function(error){
										if( error ) console.log( "failed to insert newrelic metric data in database: " + error );
										else res.status( 200 ).end( JSON.stringify( { return_value: "ok" } ) );
									} )
								} else console.log( "failed to verify agent settings: newrelic agent with id " + agent_id + " not found" );
							} );
						}
					} else {
						console.log( "newrelic agent, unknown method, see url: " + request_url );
						res.status( 200 ).end( JSON.stringify( { return_value: "ok" } ) );
					}
				}
			} catch( _error ) {
				console.log( "newrelic server unexpected error: " + _error );
			}
		}

		ctx.express.get("/test", function (req, res) {
			db.collection("projects").find({}).toArray( function( error, projects_array ) {
				var _response = "";
				_.each( projects_array, function( project ) {
					_response += "project: " + project.name + "<br/>";
				} );
				res.writeHead( 200, {'Content-Type': 'text/html'} );
				res.status( 200 ).end( "<strong>projects:</strong><br/>" + _response );
			} )
		} )

		function _log( data ) {
			fs.appendFile( "server_newrelic.log", data );
			fs.appendFile( "server_newrelic.log", "\n" );
		}

		// prepares json object to insert in mongodb
		// removes '.' from json property name, e.g. replace 'app_name.0' with 'app_name_0'
		function _prepare_2_db( _json ) {
			for( var p in _json ) {
				if( (p + "").indexOf(".") >= 0 ) {
					var _new_prop_name = _replace( p + "", ".", "_" );
					_json[_new_prop_name] = _json[p];
					delete _json[p];
				}
				if( typeof _json[p] == "object" || typeof _json[p] == "array" )
					_prepare_2_db( _json[p] );
			}
		}
		
		function _replace( str, from, to ) {
			while( str.indexOf(from) >= 0 )
				str = str.replace( from, to );
			return str;
		}

		cb( null, {} );
	} ) // safe.sure
	); // ctx.api.mongo.getDb
}
