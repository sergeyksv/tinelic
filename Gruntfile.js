/*jslint node: true */
'use strict';
var path = require('path');
var requirejs = require('requirejs');
requirejs.define.amd.dust = true;

module.exports = function(grunt) {

	grunt.event.once('git-describe', function(rev) {
		grunt.option('buildrev', rev);
	});

	grunt.initConfig({
		requirejs: {
			compile: {
				options: {
					appDir: "./modules/web/app",
					baseUrl: ".",
					dir: "./modules/web/public/js/build",
					findNestedDependencies: true,
					removeCombined: true,
					skipDirOptimize: false,
					modules: [{
						name: "app"
					}, {
						name: "routes/main",
						exclude: [
							"app"
						]
					}],
					paths: {
						"tson": "../../tinyback/tson",
						"prefixify": "../../tinyback/prefixify",
						"tinybone": "../../tinybone",
						"lodash": "../public/js/lodash",
						"dust.core": "../public/js/dust",
						"dust.parse": "../public/js/parser",
						"dust.compile": "../public/js/compiler",
						"md5":"../public/js/md5",
						"dust-helpers": "../public/js/dust-helpers",
						"dustc": "../../tinybone/dustc",
						"text": "../../../node_modules/requirejs-text/text",
						"safe": "../public/js/safe",
						"bootstrap": "../public/js/bootstrap",
						"moment": "../public/js/moment",
						"backctx": "empty:",
						"highcharts": "empty:",
						"jquery": "empty:",
						"jquery-cookie": "../public/js/jquery-cookie",
						"jquery.blockUI": "../public/js/jquery.blockUI",
						"jquery.tablesorter.combined": "../public/js/jquery.tablesorter.combined",
					},
					done: function(done, output) {
						console.log(output);
						done();
					}
				}
			}
		},
		"git-describe": {
			"options": {},
			"main": {}
		},
		uglify: {
			tinelic: {
				files: {
					'./modules/web/public/js/build/tinelic.js':['./modules/web/public/js/raven.js','./modules/web/app/rum.js'],
					'./modules/web/public/js/build/jquery-1.11.3.js':'./modules/web/public/js/jquery-1.11.3.js'
					},
				options: {
					preserveComments: false,
					beautify: {
						ascii_only: true,
						quote_keys: true
					},
					compress: {
						hoist_funs: true,
						join_vars: true,
						loops: true,
						conditionals: true,
						if_return: true,
						unused: true,
						comparisons: true
					},
					report: "min",
					mangle: {
						except: [ "undefined" ]
					}
				}
			}
		},
		nodemon: {
			dev: {
				script: 'app.js'
			}
		}
	});

	grunt.registerTask('ensureLocalConfig', function() {
		var config = {};
		if (grunt.file.exists('local-config.js'))
			config = require("./local-config.js");
		var rev = grunt.option('buildrev').toString();
		if (config.rev != rev) {
			config.rev = rev;
			grunt.file.write('local-config.js', "module.exports=" + JSON.stringify(config, null, "\t"));
		}
	});

	grunt.registerTask('default', []);

	grunt.registerTask('build', ['git-describe', 'ensureLocalConfig', 'requirejs:compile','uglify']);

	grunt.registerTask('server', ['build', 'nodemon']);

	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-git-describe');
	grunt.loadNpmTasks('grunt-nodemon');
	grunt.loadNpmTasks('grunt-contrib-uglify');
};
