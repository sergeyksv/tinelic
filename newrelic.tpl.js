'use strict';
/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
	/**
	 * Hostname for the New Relic collector proxy.
	 *
	 * @env NEW_RELIC_HOST
	 */
	host : 'localhost',
	/**
	 * The port on which the collector proxy will be listening.
	 *
	 * @env NEW_RELIC_PORT
	 */
	port: 443,
	/**
	 * Whether the module is enabled.
	 *
	 * @env NEW_RELIC_ENABLED
	 */
	agent_enabled: true,
	/**
	 * Array of application names.
	 */
	app_name: ['Tinelic Web'],
	/**
	 * Your New Relic license key.
	 */
	license_key: '671b4b29dbe984cfa802ba6a161e1f00bdaa7582',
	logging: {
		/**
		 * Level at which to log. 'trace' is most useful to New Relic when diagnosing
		 * issues with the agent, 'info' and higher will impose the least overhead on
		 * production applications.
		 */
		level: 'info'
	},
	/**
	 * When true, all request headers except for those listed in attributes.exclude
	 * will be captured for all traces, unless otherwise specified in a destination's
	 * attributes include/exclude lists.
	 */
	allow_all_headers: true,
	attributes: {
		/**
		 * Prefix of attributes to exclude from all destinations. Allows * as wildcard
		 * at end.
		 *
		 * NOTE: If excluding headers, they must be in camelCase form to be filtered.
		 *
		 * @env NEW_RELIC_ATTRIBUTES_EXCLUDE
		 */
		exclude: [
			/* example
			'request.headers.cookie',
			'request.headers.authorization',
			'request.headers.proxyAuthorization',
			'request.headers.setCookie*',
			'request.headers.x*',
			'response.headers.cookie',
			'response.headers.authorization',
			'response.headers.proxyAuthorization',
			'response.headers.setCookie*',
			'response.headers.x*'
			*/
		]
	}
};