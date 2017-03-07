/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
var fs = require('fs');
var argv = require('yargs').argv;
var _ = require("lodash");

var config = require("./config.js");

var lcfgPath = argv.config || "./local-config.js";
if (fs.existsSync(lcfgPath)) {
    config = _.merge(config, require(lcfgPath));
}
var port = config.server.port;

exports.config = {
  agent_enabled: true,
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
  port : port,
  ssl : false
};
