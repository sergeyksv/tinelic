var url = require("url");
var fs = require("fs");
var safe = require("safe");
var _ = require("lodash");

module.exports.deps = ['mongo'];

module.exports.init = function ( ctx, cb ) {
	this.agent_id = 134;
	var newrelic_agent = this;

	cb( null, {} );
	console.log( "server for newrelic agent started" );

	function db_api( cb_2 ) {
		console.log( "00" );
		ctx.api.mongo.getDb(
			{},
			safe.sure(
				function( error ) {
					console.log("ERROR: " + error);
				}, function( db ) {
					console.log( "0" );
					/*cb_2( null, {
						agent_connected: function( cb_3, agents ) {
							console.log( "1" );
							_.each( agents, function( agent ) {
								console.log( "agent..." );
								db.collection("newrelic_agents").find( {"agent": agent.app_name} ).toArray( function( error, agents_arr ) {
									if( agents_arr.length == 0 )
										db.collection("newrelic_agents").insert( {"agent": agent.app_name, "configurations": agent}, function(error, result){
											console.log( "id: " + result._id );
											// TODO
										});
									else db.collection("newrelic_agents").update( {"agent": agent.app_name}, { "agent": agent.app_name, "configurations": agent}, function(){
										// TODO
									});
								})
							});
						},
						test: function( nothing ) {}
					});*/
					/*db.collection("newrelic_agents").find( {"agent": "bla"} ).toArray(
						function(error, agents) {
							console.log( "agents number: " + agents.length );
							if( agents.length > 0 ) {
								console.log( "exists" );
								db.collection("newrelic_agents").update( agents[0], { "agent": "bla", "environment": {"dd": "ee"}}, function(){});
							} else{
								console.log( "not found" );
								db.collection("newrelic_agents").insert( {"agent": "bla", "environment": {}}, function(){} );
							}
						}
					);*/
				}
			)
		);
	}
	// db_api( function() {} );

	ctx.express.post( "/agent_listener/invoke_raw_method", function( req, res ) {
		var request_data = "";
		var request_url = "";
		
		// receive data
		req.on( "data", function( data ) {
			request_data += data;
		} );
		req.on( "end", function() {
			on_agent_request( res, req.url, request_data );
		} );
	} );

	function on_agent_request( res, request_url, request_data ) {
		var query = url.parse( request_url, true ).query;
		// what do newrelic wants?
		var response_status = 500, response_data = "unrecognized request";
		if( query.method == "get_redirect_host" ) {
			// it's first request by newrelic agent, like agent.connect()
			response_data = JSON.stringify( { return_value: "localhost:80" } );
			response_status = 200;
		} else if( query.method == "connect" ) {
			// it's second request by newrelic agent, it want to obtain its ID which will be used when
			// newrelic agent send gathered statistics
      		response_data = JSON.stringify( { return_value: {agent_run_id: newrelic_agent.agent_id++} } );
			response_status = 200;
			console.log( "connect" );
			db_api( function() {

			} );
			/*db_api( function( error, api ) {
				if( !error )
					api.agent_connected( JSON.parse( request_data ) );
			});*/
		} else if( query.method == "agent_settings" ) {
			// it's third request by newrelic agent, it want to server confirm its client configurations
			// so newrelic agent sends it's serialized json configurations to server as request body
			// and we send it back without changes
			response_data = request_data;
			response_status = 200;
		} else if( query.method == "error_data" ) {
      response_data = JSON.stringify( { return_value: "ok" } );
			response_status = 200;
		} else if( query.method == "metric_data" ) {
      response_data = JSON.stringify( { return_value: "ok" } );
			response_status = 200;
		} else if( query.method == "transaction_sample_data" ) {
      response_data = JSON.stringify( { return_value: "ok" } );
			response_status = 200;
		} else if( query.method == "sql_trace_data" ) {
      response_data = JSON.stringify( { return_value: "ok" } );
			response_status = 200;
		} else if( query.method == "shutdown" ) {
      response_data = JSON.stringify( { return_value: "ok" } );
			response_status = 200;
		} else if( query.method == "analytic_event_data" ) {
      response_data = JSON.stringify( { return_value: "ok" } );
			response_status = 200;
		}
		_log( "request url: " + request_url );
		_log( "request data: " + request_data );
		_log( "response status: " + response_status );
		_log( "response data: " + response_data );
		res.status( response_status ).end( response_data );
	}

	function _log( data ) {
		/* fs.appendFile( "sever_newrelic.log", data );
		fs.appendFile( "sever_newrelic.log", "\n" ); */
	}

	ctx.express.get("/test", function (req, res) {
		res.status(200).end( "test ok" );
	} )
}
