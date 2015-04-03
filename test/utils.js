"use strict";

var Db = require('mongodb').Db;
var Doby;
var Server = require('mongodb').Server;
var safe = require('safe');
var childProcess = require('child_process');
var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var _ = require('lodash');
var mutils = require('mongo-utils');
var async = require('safe');
var fs = require('fs');
var os = require("os");

var childs = [];

process.on('SIGINT', STOP);
process.on('SIGTERM', STOP);
process.on('uncaughtException', STOP);

function STOP (err) {
	if (err)
		console.trace(err);

	killChilds();

	process.exit(err ? 1 : 0);
}


function dropDb(cb){
	var tag = "tqa";
	var dbs = new Db(tag, new Server('localhost', 27017), {w:1});
	dbs.open(safe.sure(cb, function (db) {
		db.dropDatabase(safe.sure(cb, function () {
			dbs = new Db(tag, new Server('localhost', 27017), {w:1});
			dbs.open(safe.sure(cb, function (db) {
				Doby = db;
				async.parallel([
					function(cb) {
						db.collection('users').insert({login: 'test1', pass: '123456',role: "admin", firstname: 'test',lastname: "TEST"},cb)
					}
				], cb);
			}))
		}))
	}))
}

module.exports.shutdownContext = function (done) {
	var deferred = new webdriver.promise.Deferred();

	killChilds();
	setTimeout(function () {
		deferred.fulfill(true);
		done();
	}, 100);

	return deferred.promise;
}

module.exports.getApp = function (opts, cb) {
	var fixture = opts.fixture || false;
	var tag = "tqa";
	var dbs = new Db(tag, new Server('localhost', 27017),{w:1});
	safe.run(function(cb) {
		if (fixture=="empty")
			dropDb(cb);
		else
			cb();
	}, safe.sure(cb,function () {
		var app = childProcess.fork(__dirname+"/../app.js",['automated'],{/*silent:true*/});
		app.on('message',function (msg) {
			if (msg.c=='startapp_repl')
				cb(msg.data);
		})
		childs.push(app);
	}))
}

var browser = "chrome";
module.exports.getBrowser = function(cb) {
	safe.run(function (cb) {
		if (browser === "firefox") {
			var driver = new webdriver.Builder().
				forBrowser('firefox').
				build();

			cb(null, driver);
		}

		if (browser === "chrome") {
			var driver = new webdriver.Builder().
				forBrowser('chrome').
				build();

			cb(null, driver);
		}

		if (browser === "phantomjs") {
			var phantom = childProcess.spawn(require("phantomjs").path, ["--webdriver=127.0.0.1:9134"
				,"--webdriver-loglevel=DEBUG","--remote-debugger-port=9000","--debug=yes"
			]);
			var driver = null;
			var error = null;
			phantom.stdout.on('data', function (data) {
				var line = data.toString();
				if (driver==null) {
					if (/GhostDriver - Main - running /.test(line)) {
						driver = new webdriver.Builder().
							usingServer("http://127.0.0.1:9134").
							withCapabilities({'browserName': 'chrome'}).
							build();
						cb(null, driver);
					} else if (/Error/.test(line))
						cb(new Error("Browser can't be started"));
				} else {
					console.log(line);
					if (error)
						error+=line;
					if (/Error/.test(line)) {
						//error = line;
						//setTimeout(function () {
						//	driver.controlFlow().abortNow_(new Error(error))
						//},100)
					}
				}
			});

			childs.push(phantom);
		}
	}, safe.sure(cb, function (driver) {
		driver.manage().timeouts().implicitlyWait(0).then(function () {
			cb(null, driver);
		})
	}));
}

module.exports.makeDbSnapshot = function (snapname, cb) {
	mutils.dumpDatabase("tcp://localhost:27017/tqa",__dirname+"/snapshots/"+snapname,cb);
}

module.exports.restoreDbSnapshot = function (snapname, cb) {
	dropDb(safe.sure(cb,function(){
		mutils.restoreDatabase("tcp://localhost:27017/tqa",__dirname+"/snapshots/"+snapname,cb);
	}));
}

module.exports.noerror = function (f) {
	return function (data) {
		f.call(this, null, data);
	}
}

module.exports.notError = function (v) {
	if (v instanceof Error) throw v.message;
}

var tutils = module.exports;
module.exports.setupContext = function (done) {
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
	}
	this.trackError = function (done) {
		self._done = done;
		self.browser.controlFlow().once('uncaughtException', this._uncaughtException)
	}
	this.fixture = function (tag) {
		if (!self.fixtures)
			self.fixtures={};

		return self.browser.controlFlow().execute(function () {
			if (self.fixtures[tag])
				return self.fixtures[tag];
			return webdriver.promise.checkedNodeCall(function(cb) {
				fs.readFile(__dirname+"/fixtures/"+tag+".json", safe.sure(cb, function (data) {
					self.fixtures[tag]=JSON.parse(data.toString())
					cb(null, self.fixtures[tag]);
				}))
			})
		})
	}
	this.restoreDb = function (tag) {
		var deferred = new webdriver.promise.Deferred();

		tutils.restoreDbSnapshot(tag, function () {
			deferred.fulfill(true);
		});

		return deferred.promise;
	}
	this.saveDb = function (tag) {
		var deferred = new webdriver.promise.Deferred();

		tutils.makeDbSnapshot(tag, function () {
			deferred.fulfill(true);
		});

		return deferred.promise;
	}
	this.done = function () {
		self.browser.controlFlow().execute(self._done);
	}
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
	async.parallel([
		function(cb) {
			tutils.getBrowser(safe.sure(cb, function (browser_) {
				self.browser = browser_;
				cb();
			}))
		},
		function(cb) {
			tutils.getApp({fixture:"empty"},cb);
		}
	], function (err) {
		done(err);
		deferred.fulfill(true);
	});

	return deferred.promise;
}

module.exports.afterEach = function () {
	if (this.currentTest.state == "failed") {
		this.saveDb = safe.noop;
		this.restoreDb = safe.noop;
	}

	if (this._done) {
		this.browser.controlFlow().removeListener('uncaughtException', this._uncaughtException);
		delete this._done;
	}
}

function killChilds(){
	_.each(childs, function (c) {
		c.kill('SIGTERM')
	})
	childs = [];
}
