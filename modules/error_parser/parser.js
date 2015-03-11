var safe = require("safe")

function ErrorParser() {

}

ErrorParser.prototype._error = {
	project_id: /* project id */
		{ db: "_id_p", value: null, defnied: false,
			set: function( value ) {
				this.value = value;
				this.defnied = true;
			},
			verify: function() {
				if( !this.defnied ) throw new Error( "\"project_id\" is not defnied" );
				if( !this.value ) throw new Error( "\"project_id\" cannot be null" );
			}
		},
	error_date: /* when error occurred */
		{ db: "_dt", value: null, defnied: false,
			set: function( value ) {
				this.value = value;
				this.defnied = true;
			},
			verify: function() {
				if( !this.defnied ) throw new Error( "\"error_date\" is not defnied" );
				if( !this.value ) throw new Error( "\"error_date\" cannot be null" );
			}
		},
	error_reporter: /* getsentry server, getsentry client, newrelic */
		{ db: "_s_reporter", value: null, defnied: false,
			set: function( value ) {
				this.value = value ? value : "";
				this.defnied = true;
			},
			verify: function() {
				if( !this.defnied ) throw new Error( "\"error_reporter\" is not defnied" );
				if( !(this.value && (this.value + "").length) ) throw new Error( "\"error_reporter\" cannot be empty" );
			}
		},
	error_occurred_on_server: /* computer name or host in linux */
		{ db: "_s_server", value: "", defnied: false,
			set: function( value ) {
				this.value = value ? value : "";
				this.defnied = true;
			},
			verify: function() {}
		},
	error_in_language: /* nodejs, java, .net, etc... */
		{ db: "_s_language", value: "", defnied: false,
			set: function( value ) {
				this.value = value ? value : "";
				this.defnied = true;
			},
			verify: function() {}
		},
	error_occurred_on_request: /* error occurred on server during request with this url  */
		{ db: "_s_request", value: "", defnied: false,
			set: function( value ) {
				this.value = value ? value : "";
				this.defnied = true;
			},
			verify: function() {}
		},
	error_details: /* ... */
		{ db: "_o_exception", value: { }, defnied: false,
			set: function( value ) {
				this.value["_s_type"] = value["error_type"] ? value["error_type"] : "";
				this.value["_s_value"] = value["error_value"] ? value["error_value"] : "";
				this.defnied = true;
			},
			verify: function() {
				if( !this.defnied ) throw new Error( "\"_o_exception\" is not defnied" );
				if( !this.value._s_type ) throw new Error( "\"error_details._s_type\" cannot be empty" );
				if( !this.value._s_value ) throw new Error( "\"error_details._s_value\" cannot be empty" );
			}
		},
	error_stack_trace: /* ... */
		{ db: "_o_stack_trace", value: { _ar_frames: [] }, defnied: false,
			set: function( value ) {
				var _stack_item = {
					  _s_filename: value["file_name"] ? value["file_name"] : ""
					, _i_line: value["line_number"] ? value["line_number"] : 0
					, _i_col: value["column_number"] ? value["column_number"] : 0
					, _s_func: value["function_name"] ? value["function_name"] : ""
					, _b_in_app: value["in_app"] != null && value["in_app"] != "" ? value["in_app"] : true
					, _ar_pre_context: value["pre_context"] ? value["pre_context"] : ""
					, _s_context_line: value["context_line"] ? value["context_line"] : ""
					, _ar_post_context: value["post_context"] ? value["post_context"] : ""
				};
				this.value._ar_frames.push( _stack_item );
				this.defnied = true;
			},
			verify: function() {}
		}
};

ErrorParser.prototype.set = function( error_item, value ) {
	if( this._error[error_item] )
		this._error[error_item].set( value );
}

ErrorParser.prototype.get_error = function( db, cb ) {
	var error_parser = this;
	safe.waterfall(
		[
			function( cb ) {
				// verify error object
				for( var p in error_parser._error ) {
					error_parser._error[p].verify();
				}
				cb( null );
			},
			function( cb ) {
				// compile database error object
				var error_data = {};
				for( var p in error_parser._error ) {
					error_data[error_parser._error[p].db] = error_parser._error[p].value;
				}
				cb( null, error_data );
			}
		], safe.sure( cb, function ( error_data ) {
			// write object in database
			cb( null, error_data );
		} )
	);
}

module.exports = ErrorParser;

