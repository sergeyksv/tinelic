'use strict';
const path = require('path'),
	_ = require('lodash'),
	dirPath = `${__dirname}/../`,
	config = require(path.resolve(dirPath, 'config.js')),
	localConfig = require(path.resolve(dirPath, 'local-config.js'));

module.exports = () => _.defaultsDeep(localConfig, config);
