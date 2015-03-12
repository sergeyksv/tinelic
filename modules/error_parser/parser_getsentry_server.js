ErrorParser = require("./parser.js")
var util = require('util')
var safe = require("safe")

function ErrorParser_GetsentryServer() {

}
util.inherits( ErrorParser_GetsentryServer, ErrorParser );

ErrorParser_GetsentryServer.prototype.add_error = function( db, project_id, error_data, cb ) {
	var error_parser = this;
	safe.run( function() {
		var error_data_item = error_data[p];
		error_parser.set("project_id", project_id );
		error_parser.set("error_date", new Date(error_data.timestamp) );
		error_parser.set("error_reporter", "getsentry_server" );
		error_parser.set("error_occurred_on_server", error_data.server_name );
		error_parser.set("error_in_language", error_data.platform );
		for( var p in error_data.exception ) {
			var error_data_exception = error_data.exception[p];
			error_parser.set("error_details", { error_type: error_data_exception.type, error_value: error_data_exception.value } );
			// parse stack trace
			if( error_data_exception.stacktrace && error_data_exception.stacktrace.frames ) {
				for( var p in error_data_exception.stacktrace.frames ) {
					var error_frame = error_data_exception.stacktrace.frames[p];
					var stack_trace_item = {};
					stack_trace_item["file_name"] = error_frame["filename"] ? error_frame["filename"] : "";
					stack_trace_item["line_number"] = error_frame["lineno"] ? error_frame["lineno"] : "";
					stack_trace_item["column_number"] = "";
					stack_trace_item["function_name"] = error_frame["function"] ? error_frame["function"] : "";
					stack_trace_item["in_app"] = error_frame["in_app"] ? error_frame["in_app"] : "";
					stack_trace_item["pre_context"] = error_frame["pre_context"] ? error_frame["pre_context"] : "";
					stack_trace_item["context_line"] = error_frame["context_line"] ? error_frame["context_line"] : "";
					stack_trace_item["post_context"] = error_frame["post_context"] ? error_frame["post_context"] : "";
					error_parser.set("error_stack_trace", stack_trace_item );
				}
			}
		}
		error_parser.get_error( db, cb );
	}, cb );
}

module.exports = ErrorParser_GetsentryServer;

