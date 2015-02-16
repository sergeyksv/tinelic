var url = require("url");
var fs = require("fs");
var safe = require("safe");
var _ = require("lodash");
var mongo = require("mongodb");

module.exports.deps = ['mongo'];

var NRS_ERRORS = { "NRS_ERROR_1": "NRS_ERROR_1. ", "NRS_ERROR_2": "NRS_ERROR_2. ", "NRS_ERROR_3": "NRS_ERROR_3. "
					, "NRS_ERROR_4": "NRS_ERROR_4. ", "NRS_ERROR_5": "NRS_ERROR_5. ", "NRS_ERROR_6": "NRS_ERROR_6. "
					, "NRS_ERROR_7": "NRS_ERROR_7. ", "NRS_ERROR_8": "NRS_ERROR_8. ", "NRS_ERROR_9": "NRS_ERROR_9. "
					, "NRS_ERROR_10": "NRS_ERROR_10. ", "NRS_ERROR_11": "NRS_ERROR_11. ", "NRS_ERROR_12": "NRS_ERROR_12. "
					, "NRS_ERROR_13": "NRS_ERROR_13. ", "NRS_ERROR_14": "NRS_ERROR_14. ", "NRS_ERROR_15": "NRS_ERROR_15. "
					, "NRS_ERROR_16": "NRS_ERROR_16. ", "NRS_ERROR_17": "NRS_ERROR_17. ", "NRS_ERROR_18": "NRS_ERROR_18. "
					, "NRS_ERROR_19": "NRS_ERROR_19. " };

module.exports.init = function ( ctx, cb ) {
	ctx.api.mongo.getDb( {}, safe.sure( cb, function( db ) {
		
		safe.series( {
			projects_cache: function( cb ) {
				db.collection("projects").find({}).toArray( safe.sure( function( error ){ _log_error(NRS_ERRORS.NRS_ERROR_1 + error); }, function( projects_array ){
					var _projects = {};
					_.each( projects_array, function( _project ) {
						_projects[_project.name] = { 'id': _project._id, "name": _project.name };
					} );
					cb( null, _projects );
				}));
			}
		}, safe.sure( function( error ){ _log_error( NRS_ERRORS.NRS_ERROR_2 + error ); }, function( tinelic_data ) {
			ctx.express.post( "/agent_listener/invoke_raw_method", function( req, res ) {
				var request_data = "";
				var request_url = req.url;
				req.on( "data", function( data ) {
					request_data += data;
				} );
				req.on( "end", safe.sure( function(error){ _log_error( NRS_ERRORS.NRS_ERROR_6 + error ); },  function() {
					on_agent_request( res, request_url, request_data, tinelic_data );
				} ) );
			} );
			ctx.express.get("/nrs_cache", function (req, res) {
				var _response = "";
				for( var _p in tinelic_data.projects_cache )
					_response += "<strong>" + tinelic_data.projects_cache[_p].name + "</strong> " + tinelic_data.projects_cache[_p].id + "<br/>";
				res.writeHead( 200, {'Content-Type': 'text/html'} );
				res.status( 200 ).end( "<strong>Cached Projects:</strong><br/>" + _response );
			} )
		} ));

		function on_agent_request( res, request_url, request_data, tinelic_data ) {
			var query = url.parse( request_url, true ).query;
			if( query.method == "get_redirect_host" ) {
				res.status( 200 ).end( JSON.stringify( { return_value: "localhost:80" } ) );
			} else if( query.method == "connect" ) {
				// it request occurred once when agent is connected, just store it's information in database
				// ...
				// agent passes it's environment and part of configurations as array [{%agent_info%}]
				// just get first item from arrray
				var agent_info = JSON.parse( request_data );
				agent_info = agent_info[0];
				// app_name is also array, get first item
				var agent_name = agent_info.app_name[0];
				_prepare_2_db( agent_info );
				// update agent info in database
				// .. and pass project id to the agent
				if( tinelic_data.projects_cache[agent_name] ) {
					db.collection("newrelic_agents").find( {"agent": agent_name} ).toArray( function( error, agents_arr ) {
						if( error ) _log_error( NRS_ERRORS.NRS_ERROR_3 + error );
						else if( agents_arr.length == 0) {
							db.collection("newrelic_agents").insert( {"agent": agent_name, "environment": agent_info, project_id: tinelic_data.projects_cache[agent_name].id }, function(error, records){
								if( error ) _log_error( NRS_ERRORS.NRS_ERROR_4 + error );
								else res.status( 200 ).end( JSON.stringify( { return_value: {"agent_run_id": tinelic_data.projects_cache[agent_name].id} } ) );
							} )
						} else {
							db.collection("newrelic_agents").update( agents_arr[0], {$set: {"environment": agent_info}}, function(error){
								if( error ) _log_error( NRS_ERRORS.NRS_ERROR_5 + error );
								else res.status( 200 ).end( JSON.stringify( { return_value: {"agent_run_id": tinelic_data.projects_cache[agent_name].id} } ) );
							} )
						}
					} );
				} else _log_error( NRS_ERRORS.NRS_ERROR_7 + "project \"" + agent_name + "\" not found" );
			} else if( query.method == "agent_settings" ) {
				// it request occurred once after agent has been connected, just store its configurations
				var agent_configurations = JSON.parse(request_data);
				_prepare_2_db( agent_configurations );
				var project_id = query["run_id"];
				if( !project_id ) _log_error( NRS_ERRORS.NRS_ERROR_9 ); 
				else {
					db.collection("newrelic_agents").find( {"project_id": new mongo.ObjectID(project_id)} ).toArray( function( error, agents_arr ) {
						if( error ) _log_error( NRS_ERRORS.NRS_ERROR_10 + error);
						else if( agents_arr.length > 0 ) {
							db.collection("newrelic_agents").update( agents_arr[0], {$set: {"configurations": agent_configurations}}, {"upsert": true}, function(error){
								if( error ) _log_error( NRS_ERRORS.NRS_ERROR_11 + error );
								else res.status( 200 ).end( request_data );
							} )
						} else _log_error( NRS_ERRORS.NRS_ERROR_12 + "agent for project id " + project_id + " not found" );
					} );
				}
			} else {
				var project_id = query["run_id"];
				if( !project_id ) _log_error( NRS_ERRORS.NRS_ERROR_13 + "invalid request \"" + query.method + "\", run_id is undefined" ); 
				else {
					var metric_data = JSON.parse(request_data);
					_prepare_2_db( metric_data );
					safe.waterfall([
							function( cb ){
								// insert data as is, it will be used to analyze data in the future
								db.collection("newrelic_agents_metcirs").insert( {"project_id": new mongo.ObjectID(project_id), "metric": query.method, "data": metric_data}, function( error, records ){
									if( error ) cb( error );
									else cb( null, records[0]._id );
								} );
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
										, _time_end = new Date( metric_data[2] * 1000.0 );
									for( var p in _data_array ) {
										var _newrelic_item = _data_array[p];
										if( !(_newrelic_item.length > 1 && _newrelic_item[0]["scope"]) ) continue;
										var _newrelic_item_scope = _newrelic_item[0]["scope"];
										if( !_tinelic_items[_newrelic_item_scope] ) {
											_tinelic_items[_newrelic_item_scope] = {
												"project_id": new mongo.ObjectID(project_id)
												, "metric_id": metric_id
												, "name": _parse_newrelic_metric_name( _newrelic_item[0]["scope"] ).name
												, "type": _parse_newrelic_metric_name( _newrelic_item[0]["scope"] ).type
												, "time_start": _time_start
												, "time_end": _time_end
												, data: []
											};
										}
										_tinelic_items[_newrelic_item_scope].data.push( {
											"name": _parse_newrelic_metric_name( _newrelic_item[0]["name"] ).name
											, "type": _parse_newrelic_metric_name( _newrelic_item[0]["name"] ).type
											, data: _newrelic_item[1]
										} );
									}
									for( var p in _tinelic_items ) {
										db.collection("newrelic_agents_metcirs_parsed").insert( _tinelic_items[p], function( error, records ){
											if( error ) _log_error( NRS_ERRORS.NRS_ERROR_18 + error );
										} );
									}
									cb( null, metric_id )
								} else cb( null, metric_id );
							}
							, function( metric_id, cb ){
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
											"project_id": new mongo.ObjectID(project_id)
											, "metric_id": metric_id
											, "name": _parse_newrelic_metric_name( _newrelic_item["name"] ).name
											, "type": _parse_newrelic_metric_name( _newrelic_item["name"] ).type
											, "time": new Date( _newrelic_item["timestamp"] )
											, "webDuration": _newrelic_item["webDuration"]
											, "duration": _newrelic_item["duration"]
										};
										db.collection("newrelic_agents_metcirs_parsed").insert( _tinelic_item, function( error, records ){
											if( error ) _log_error( NRS_ERRORS.NRS_ERROR_19 + error );
										} );
									}
									cb( null, metric_id );
								} else cb( null, metric_id );
							}
						]
						, safe.sure( function(error){ _log_error( NRS_ERRORS.NRS_ERROR_17 + error ); }, function( metric_id ){
							res.status( 200 ).end( JSON.stringify( { return_value: "ok" } ) );
						} )
					); // waterfall
				}
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

		cb( null, {} );
	} )
	);
}
