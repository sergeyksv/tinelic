/*jslint node: true */
/*global describe, before, it, afterEach, after */
"use strict";
/*
Some notices:

For save database use
	after(function(){
		return this.saveDb('debug');
	})

For load database use
	before(function(){
		return this.restoreDb('debug');
	});

For skip current test
	describe.skip

For run only current test
	describe.only

When error occurs, screenshot is available in test's dir (active)
Predefined data stored in file `dataentry.json`
Frequently called functions should be defined in helpers
*/
var tutils = require('./utils');

describe("Let the test begins!",function () {
	this.timeout(300000);

	before(tutils.setupContext);
	before(function (done) {
		this.browser.manage().window().maximize();
		var self = this;
		setTimeout(function(){
			self.fixture('dataentry').then(tutils.noerror(done));
		}, 1024);
	});

	afterEach(tutils.afterEach);
	after(tutils.shutdownContext);

	describe('Block 1: First block', function () {
		before(function(){
			return this.saveDb('block1');
		});

		require('./blocks/block1').block().apply(this, [__dirname]);
		after(function(){
			return this.saveDb('block2');
		});
	});
});
