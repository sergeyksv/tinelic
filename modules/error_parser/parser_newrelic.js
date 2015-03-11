ErrorParser = require("./parser.js")
var util = require('util')
var safe = require("safe")

function ErrorParser_Newrelic() {

}
util.inherits( ErrorParser_Newrelic, ErrorParser );

ErrorParser_Newrelic.prototype.add_error = function( db, project_id, error_data, cb ) {
	var error_parser = this;
	safe.series(
		{
			newrelic_agent: function( cb ) {
				// get agent from database, to obtain additional agent parameters
				db.collection("newrelic_agents").find( {"_idp": project_id} ).toArray( safe.sure( cb, function( agents_arr ) {
					if( agents_arr.length > 0 ) {
						cb( null, agents_arr[0] );
					} else throw new Error( "Newrelic agent for project \"" + project_id + " not found" );
				} ) );
			}
		}, safe.sure( cb, function ( _data ) {
			// newrelic passed the set of errors occurred during time interval
			for( var p in error_data ) {
				var error_data_item = error_data[p];
				error_parser.set("project_id", project_id );
				error_parser.set("error_date", new Date() );
				error_parser.set("error_reporter", "newrelic" );
				error_parser.set("error_occurred_on_server", _data.newrelic_agent.env.host );
				error_parser.set("error_in_language", _data.newrelic_agent.env.language );
				error_parser.set("error_occurred_on_request", error_data_item[4].request_uri );
				error_parser.set("error_details", { error_type: error_data_item[3], error_value: error_data_item[2] } );
				// parse stack trace
				if( error_data_item[4]["stack_trace"] ) {
					var _lang = _data.newrelic_agent.env.language.toLowerCase();
					if( _lang == "node" || _lang == "nodejs" )
						_parse_stack_trace__nodejs( error_parser, error_data_item[4].stack_trace );
					else if( _lang == "java" )
						_parse_stack_trace__java( error_parser, error_data_item[4].stack_trace );
					else if( _lang == "php" )
						_parse_stack_trace__php( error_parser, error_data_item[4].stack_trace );
					else if( _lang == ".net" )
						_parse_stack_trace__dot_net( error_parser, error_data_item[4].stack_trace );
				}
				error_parser.get_error( db, cb );
			}
		} )
	);
}

function _parse_stack_trace__nodejs( error_parser, stack_trace ) {
	// "stack_trace" is array of lines
	for( var p in stack_trace ) {
		var line = stack_trace[p];
		var stack_trace_item = {};
		var _TOKEN = "at ";
		if( line.indexOf( _TOKEN ) >= 0 ) {
			line = line.substr( line.indexOf( _TOKEN ) + _TOKEN.length );
			_TOKEN = "(";
			if( line.indexOf( _TOKEN ) >= 0 ) {
				stack_trace_item["function_name"] = line.substr( 0, line.indexOf( _TOKEN ) ).trim();
				line = line.substr( line.indexOf( _TOKEN ) + _TOKEN.length );
				_TOKEN = ":";
				if( line.indexOf( _TOKEN ) >= 0 ) {
					stack_trace_item["file_name"] = line.substr( 0, line.indexOf( _TOKEN ) ).trim();
					line = line.substr( line.indexOf( _TOKEN ) + _TOKEN.length );
					// line number and column number
					line = line.replace( ")", "" );
					var arr_line_items = line.split( ":" );
					if( arr_line_items.length == 2 ) {
						stack_trace_item["line_number"] = arr_line_items[0];
						stack_trace_item["column_number"] = arr_line_items[1];
					} else if( arr_line_items.length == 1 ) {
						stack_trace_item["line_number"] = arr_line_items[0];
					}
					error_parser.set("error_stack_trace", stack_trace_item );
				}
			}
		}
	}
}

function _parse_stack_trace__java( error_parser, stack_trace ) {
	// TODO
}

function _parse_stack_trace__dot_net( error_parser, stack_trace ) {
	// TODO
}

function _parse_stack_trace__php( error_parser, stack_trace ) {
	// TODO
}

module.exports = ErrorParser_Newrelic;

