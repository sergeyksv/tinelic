var url = require("url");
var fs = require("fs");
var safe = require("safe");
var _ = require("lodash");
var mongo = require("mongodb");
var zlib = require('zlib');
ErrorParser_Newrelic = require( "../error_parser/parser_newrelic.js" );

module.exports.deps = ['mongo'];

module.exports.init = function ( ctx, cb_main ) {
	ctx.api.mongo.getDb( {}, safe.sure( cb_main, function( db ) {
		
		function cb_error( error ) {
			_log_error( "NEWRELIC_SERVER ERROR: " + (error.stack ? error.stack : error) + "\n" );
		}

		safe.series( {
			projects_cache: function( cb ) {
				db.collection("projects").find({}).toArray( safe.sure( cb_error, function( projects_array ){
					var _projects = {};
					_.each( projects_array, function( _project ) {
						_projects[_project.name] = { 'id': _project._id, "name": _project.name };
					} );
					cb( null, _projects );
				} ) );
			}
		}, safe.sure( cb_error, function( tinelic_data ) {
			/* request from newrelic agent */
			ctx.express.post( "/agent_listener/invoke_raw_method", function( req, res ) {
				safe.run( function() {
					if( !req.body )
						throw new Error( "Cannot parse body (" + req.url + ")" );
					// when newrelic accumulated big data it zips requests, but body-parser inflates it
					var _body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
					on_agent_request( res, req.url, _body, tinelic_data );
				}, function( error ){
					cb_error( error );
					safe.run( function(){
						// return server error to newrelic
						res.status( 200 ).json( {exception: {message: "Server error: " + error}} );
					}, cb_error );
				} );
			} );
			/* test request from web */
			ctx.express.get("/nrs_cache", function (req, res) {
				safe.run( function() {
					var _response = "";
					for( var _p in tinelic_data.projects_cache )
						_response += "<strong>" + tinelic_data.projects_cache[_p].name + "</strong> " + tinelic_data.projects_cache[_p].id + "<br/>";
					res.writeHead( 200, {'Content-Type': 'text/html'} );
					res.status( 200 ).end( "<strong>Cached Projects:</strong><br/>" + _response );
				}, function( error ){
					cb_error( error );
					safe.run( function(){
						res.writeHead( 200, {'Content-Type': 'text/html'} );
						res.status( 200 ).end( "<strong>Cannot process request:</strong> " + error );
					}, cb_error );
				} );
			} )
		} ));

		function on_agent_request( res, request_url, request_data_json, tinelic_data ) {
			var query = url.parse( request_url, true ).query;
			if( query.method == "get_redirect_host" ) {
				res.status( 200 ).json( { return_value: "localhost:80" } );
			} else if( query.method == "connect" ) {
				// it request occurred once when agent is connected, just store it's information in database
				// ...
				// agent passes it's environment and part of configurations as array [{%agent_info%}]
				// just get first item from arrray
				agent_info = request_data_json[0];
				// app_name is also array, get first item
				var agent_name = agent_info.app_name[0];
				_prepare_2_db( agent_info );
				if( !tinelic_data.projects_cache[agent_name] )
					throw new Error( "Project \"" + agent_name + "\" not found" );
				var project_id = tinelic_data.projects_cache[agent_name].id;
				// update agent info in database
				safe.waterfall( [
					function( cb ) { // find existing
						db.collection("newrelic_agents").find( {"r": agent_name} ).toArray( safe.sure( cb_error, function( agents_arr ) {
							cb( null, agents_arr.length > 0 ? agents_arr[0]._id : 0 );
						} ) );
					}, function( agent_id, cb ) { // insert new if doesn't exist
						if( agent_id )
							cb( null, agent_id );
						else db.collection("newrelic_agents").insert( {"r": agent_name, "_idp": tinelic_data.projects_cache[agent_name].id }, safe.sure( cb_error, function( records ){
							cb( null, records[0]._id );
						} ) );
					}, function( agent_id, cb ) { // update data for existing
						db.collection("newrelic_agents").update( { "_id": agent_id }, {$set: {"env": agent_info}}, safe.sure( cb_error, function(){
							cb( null, agent_id );
						} ) );
					}
				], safe.sure( cb_error, function( project_id ) {
					// TODO
				} ) );
				res.status( 200 ).json( { return_value: {"agent_run_id": tinelic_data.projects_cache[agent_name].id} } );
			} else if( query.method == "agent_settings" ) {
				// it request occurred once after agent has been connected, just store its configurations
				var agent_configurations = request_data_json;
				_prepare_2_db( agent_configurations );
				var project_id = query["run_id"];
				if( !project_id )
					throw new Error( "Project is undefined" );
				// update agent info in database
				safe.waterfall( [
					function( cb ) {
						db.collection("newrelic_agents").find( {"_idp": new mongo.ObjectID(project_id)} ).toArray( safe.sure( cb_error, function( agents_arr ) {
							cb( null, agents_arr.length > 0 ? agents_arr[0]._id : 0 );
						} ) );
					}
					, function( agent_id, cb ) {
						if( !agent_id )
							throw new Error( "Agnet for project #" + project_id + " not found" );
						db.collection("newrelic_agents").update( { "_id": agent_id }, {$set: {"cfg": agent_configurations}}, safe.sure( cb_error, function(){
							// TODO
						} ) );
					}
				] , safe.sure( cb_error, function() {
					// TODO
				} ) );
				res.status( 200 ).json( request_data_json );
			} else {
				var project_id = query["run_id"];
				if( !project_id )
					throw new Error( "invalid request \"" + query.method + "\", run_id is undefined" ); 
				var metric_data = request_data_json;
				_prepare_2_db( metric_data );
				safe.waterfall([
						function( cb ){
							// insert data as is, it will be used to analyze data in the future
							db.collection("newrelic_agents_metcirs").insert( {"_idp": new mongo.ObjectID(project_id), "r": query.method, "data": metric_data}, safe.sure( cb_error, function( records ){
								cb( null, records[0]._id );
							} ) );
						}
						, function( metric_id, cb ) {
							// parse known data
							if( query.method == "metric_data" ) {
								var _tinelic_items = {};
								var _data_array = metric_data[metric_data.length - 1];
								// the first three items of array:
								// [0] - newrelic passes it's ID, which matches "agent_id" in url and is "project_id"
								// [1], [2] - start and end date of measure. Date has format of floating number:
								// integer part is seconds, floating part is milliseconds, e.g. 1.424094140614E9 is
								// 1.424094140614E9 * 1000.0 milliseconds
								var _time_start = new Date( metric_data[1] * 1000.0 )
									, _time_end = new Date( metric_data[2] * 1000.0 )
									, _time_avg = new Date( (_time_start.getTime() + _time_end.getTime()) / 2.0 );
								for( var p in _data_array ) {
									var _newrelic_item = _data_array[p];
									if( !(_newrelic_item.length > 1 && _newrelic_item[0]["scope"]) ) continue;
									var _newrelic_item_scope = _newrelic_item[0]["scope"];
									if( !_tinelic_items[_newrelic_item_scope] ) {
										_tinelic_items[_newrelic_item_scope] = {
											"_idp": new mongo.ObjectID(project_id)
											, "_idm": metric_id
											, "r": _parse_newrelic_metric_name( _newrelic_item[0]["scope"] ).name
											, "t": _parse_newrelic_metric_name( _newrelic_item[0]["scope"] ).type
											, "_dt": _time_avg
											, "_dts": _time_start
											, "_dte": _time_end
											, data: []
										};
									}
									_tinelic_items[_newrelic_item_scope].data.push( {
										"r": _parse_newrelic_metric_name( _newrelic_item[0]["name"] ).name
										, "t": _parse_newrelic_metric_name( _newrelic_item[0]["name"] ).type
										, "data": _newrelic_item[1]
									} );
								}
								for( var p in _tinelic_items ) {
									db.collection("actions_stats").insert( _tinelic_items[p], safe.sure( cb_error, function( records ){
										// TODO
									} ) );
								}
							}
							cb( null, metric_id );
						}
						, function( metric_id, cb ) {
							// parse known data
							if( query.method == "analytic_event_data" ) {
								var _data_array = metric_data[metric_data.length - 1];
								for( var p in _data_array ) {
									var _newrelic_item = _data_array[p][0];
									// "timestamp" in newrelic is double representation of Date() object
									// (number of milliseconds singe 197...)
									// "timestamp" has no floating part, milliseconds are included in integer part
									// e.g "timestamp=1.424094139391E12" is Mon Feb 16 2015 05:42:19 GMT-0800 (PST) 391
									var _tinelic_item = {
										"_idp": new mongo.ObjectID(project_id)
										, "_idm": metric_id
										, "r": _parse_newrelic_metric_name( _newrelic_item["name"] ).name
										, "t": _parse_newrelic_metric_name( _newrelic_item["name"] ).type
										, "_dt": new Date( _newrelic_item["timestamp"] )
										, "_iwt": _newrelic_item["webDuration"]
										, "_itt": _newrelic_item["duration"]
									};
									db.collection("actions").insert( _tinelic_item, safe.sure( cb_error, function( records ){
										// TODO
									} ) );
								}
								cb( null, metric_id );
							} else cb( null, metric_id );
						}
						, function( metric_id, cb ) {
							// parse error data
							if( query.method == "error_data" ) {
								var _data_array = metric_data[metric_data.length - 1];
								if( !_data_array )
									throw new Error( "Newrelic metric data is empty" );
								// write object in database
								var error_parser = new ErrorParser_Newrelic();
								error_parser.add_error( db, new mongo.ObjectID(project_id), _data_array, safe.sure( cb_error, function( error_data ) {
									db.collection("actions_errors").insert( error_data, safe.sure( cb, function( records ){
										// TODO
									} ) );
								} ) );
								cb( null, metric_id );
							} else cb( null, metric_id );
						}
					]
					, safe.sure( cb_error, function( metric_id ){
						// TODO
					} )
				); // waterfall
				res.status( 200 ).json( { return_value: "ok" } );
			}
		}

		function _parse_newrelic_metric_name( value ) {
			var _value_array = value.split( "/" );
			var _type = _value_array.length > 1 ? _value_array[0] + "/" + _value_array[1] : ""
				, _name = "";
			for( var i = 2; i < _value_array.length; i++ )
				_name += (_name.length > 0 ? "/" : "") + _value_array[i];
			return { name: _name.length ? _name : "-unknown-", type: _type.length ? _type : "-unknown-" };
		}

		function _log_error( data ) {
			_log( data );
			fs.appendFile( "server_newrelic_error.log", data );
			fs.appendFile( "server_newrelic_error.log", "\n" );
			console.log( data );
		}

		function _log( data ) {
			/*
			fs.appendFile( "server_newrelic.log", data );
			fs.appendFile( "server_newrelic.log", "\n" );
			*/
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

		cb_main( null, {} );
	} )
	);
}
