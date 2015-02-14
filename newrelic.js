/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : ['Tinelic Web'],
  /**
   * Your New Relic license key.
   */
  license_key : '671b4b29dbe984cfa802ba6a161e1f00bdaa7582',
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info'
  },
  host : 'localhost',
  port : 80,
  ssl : false
};
