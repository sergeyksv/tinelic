/*jslint node: true */
"use strict";

var Db = require('mongodb').Db;
var Doby;
var Server = require('mongodb').Server;
var safe = require('safe');
var childProcess = require('child_process');
var webdriver = require('selenium-webdriver');
var _ = require('lodash');
var fs = require('fs');
var { Buffer } = require('safe-buffer');
var argv = require('yargs').argv;
var childs = [];
var driver;
var browser = argv.browser || "phantomjs";

process.on('SIGINT', STOP);
process.on('SIGTERM', STOP);
process.on('uncaughtException', STOP);

function STOP (err) {
	if (err)
		console.log(err.stack);

	killChilds();

	if (driver)
		driver.quit();

	process.exit(err ? 1 : 0);
}


function dropDb(cb){
	var tag = "tinelic_test";
	var dbs = new Db(tag, new Server('localhost', 27017), {w:1});
	dbs.open(safe.sure(cb, function (db) {
		db.dropDatabase(cb);
	}));
}

module.exports.shutdownContext = function () {
	var deferred = new webdriver.promise.Deferred();

	killChilds();
	setTimeout(function () {
		deferred.fulfill(true);
	}, 100);

	return deferred.promise;
};

module.exports.getApp = function (opts, cb) {
	var fixture = opts.fixture || false;
	safe.run(function(cb) {
		if (fixture=="empty")
			dropDb(cb);
		else
			cb();
	}, safe.sure(cb,function () {
		var app = childProcess.fork(__dirname+"/../app.js",['--config',argv.testenv!='test'?'./test/config.js':'./test/config-test.js'],{silent:false});
		app.on('message',function (msg) {
			if (msg.c=='startapp_repl')
				cb(msg.data);
		});
		childs.push(app);
	}));
};

module.exports.getBrowser = function(cb) {
	safe.run(function (cb) {
		if (browser === "firefox") {
			driver = new webdriver.Builder().
				forBrowser('firefox').
				build();

			cb(null, driver);
			return;
		}

		if (browser === "chrome" || browser === "chrome-headless") {
			var chrome = require('selenium-webdriver/chrome');
			var opt = new chrome.Options();
			if (browser === "chrome-headless") {
				opt.addArguments("--headless");
			}
			driver = new webdriver.Builder()
				.forBrowser('chrome')
				.setChromeOptions(opt)
				.build();

			cb(null, driver);
			return;
		}

		if (browser === "phantomjs") {
			var phantom = childProcess.spawn(require("phantomjs-prebuilt").path, ["--webdriver=127.0.0.1:9134"/*,"--remote-debugger-port=9000"*/]);
			var error = null;
			phantom.stdout.on('data', function (data) {
				var line = data.toString();
				if (!driver) {
					if (/GhostDriver - Main - running /.test(line)) {
						driver = new webdriver.Builder()
							.usingServer("http://127.0.0.1:9134")
							.withCapabilities({'browserName': 'chrome'})
							.build();

						cb(null, driver);
					} else if (/Error/.test(line))
						cb(new Error("Browser can't be started"));
				} else {
					if (error)
						error+=line;
					if (/Error/.test(line)) {
						error = line;
						setTimeout(function () {
							driver.controlFlow().abortNow_(new Error(error));
						},100);
					}
				}
			});

			childs.push(phantom);
		}
	}, safe.sure(cb, function (driver) {
		driver.manage().timeouts().implicitlyWait(0).then(function () {
			cb(null, driver);
		});
	}));
};

module.exports.makeDbSnapshot = function (snapname, cb) {
	var str = `mongodump --host localhost --db tinelic_test --out ${__dirname}/snapshots/${snapname}/`;
	childProcess.exec(str, cb);
};

module.exports.restoreDbSnapshot = function (snapname, cb) {
	var str = `mongorestore --host localhost --drop ${__dirname}/snapshots/${snapname}/`;
	childProcess.exec(str, cb);
};

module.exports.noerror = function (f) {
	return function (data) {
		f.call(this, null, data);
	};
};

module.exports.notError = function (v) {
	if (v instanceof Error) throw v.message;
};

var tutils = module.exports;
module.exports.setupContext = function () {
	var self = this;
	var deferred = new webdriver.promise.Deferred();

	this._uncaughtException = function(err){
		self.browser.takeScreenshot().then(function(text){
			require("fs").writeFileSync(__dirname+"/screenshot_err.png",new Buffer(text, 'base64'));
			killChilds();
			setTimeout(function(){
				self._done(err);
			},100);
		});
	};
	this.trackError = function (done) {
		self._done = done;
		self.browser.controlFlow().once('uncaughtException', this._uncaughtException);
	};
	this.fixture = function (tag) {
		if (!self.fixtures)
			self.fixtures={};

		return self.browser.controlFlow().execute(function () {
			if (self.fixtures[tag])
				return self.fixtures[tag];
			return webdriver.promise.checkedNodeCall(function(cb) {
				fs.readFile(__dirname+"/fixtures/"+tag+".json", safe.sure(cb, function (data) {
					self.fixtures[tag]=JSON.parse(data.toString());
					cb(null, self.fixtures[tag]);
				}));
			});
		});
	};
	this.restoreDb = function (tag) {
		var deferred = new webdriver.promise.Deferred();

		tutils.restoreDbSnapshot(tag, function () {
			deferred.fulfill(true);
		});

		return deferred.promise;
	};
	this.saveDb = function (tag) {
		var deferred = new webdriver.promise.Deferred();

		tutils.makeDbSnapshot(tag, function () {
			deferred.fulfill(true);
		});

		return deferred.promise;
	};
	this.done = function () {
		self.browser.controlFlow().execute(self._done);
	};
	this.findInDb = function(collection, query, sort, skip, limit, cb1) {
		self.browser.controlFlow().execute(function () {
			return webdriver.promise.checkedNodeCall(function(cb) {
				skip = parseInt(skip) || 0;
				limit = parseInt(limit) || 0;

				Doby.collection(collection).find(query).sort(sort).skip(skip).limit(limit).toArray(cb1);
				cb();
			});
		});
	};
	safe.parallel([
		function(cb) {
			tutils.getBrowser(safe.sure(cb, function (browser_) {
				self.browser = browser_;
				cb();
			}));
		},
		function(cb) {
			tutils.getApp({fixture:"empty"},cb);
		}
	], function (err) {
		if (err)
			deferred.reject(err);
		else
			deferred.fulfill(true);
	});

	return deferred.promise;
};

module.exports.afterEach = function () {
	if (this.currentTest.state == "failed") {
		this.saveDb = safe.noop;
		this.restoreDb = safe.noop;
	}

	if (this._done) {
		this.browser.controlFlow().removeListener('uncaughtException', this._uncaughtException);
		delete this._done;
	}
};

function killChilds(){
	_.each(childs, function (c) {
		c.kill('SIGTERM');
	});
	childs = [];
}
