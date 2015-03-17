ErrorParser = require("./parser.js")
var util = require('util')
var safe = require("safe")

function ErrorParser_Newrelic() {

}
util.inherits( ErrorParser_Newrelic, ErrorParser );

ErrorParser_Newrelic.prototype.add_error = function( run, error_data, cb ) {
	var error_parser = this;
	// newrelic passed the set of errors occurred during time interval
	for( var p in error_data ) {
		var error_data_item = error_data[p];
		error_parser.set("project_id", run._idp );
		error_parser.set("error_date", new Date() );
		error_parser.set("error_reporter", "newrelic" );
		error_parser.set("error_occurred_on_server", run._s_host );
		error_parser.set("error_in_logger", run._s_logger );
		error_parser.set("error_occurred_on_request", error_data_item[4].request_uri );
		error_parser.set("error_details", { error_type: error_data_item[3], error_value: error_data_item[2] } );
		// parse stack trace
		if( error_data_item[4]["stack_trace"] ) {
			// "stack_trace" is array of lines
			for( var p in error_data_item[4].stack_trace ) {
				var line = error_data_item[4].stack_trace[p];
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
		error_parser.get_error( null, cb );
	}
}

module.exports = ErrorParser_Newrelic;
