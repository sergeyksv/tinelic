"use strict";

var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var safe = require('safe');
var _ = require('lodash');
var helpers = require('../helpers');

// for phantomjs not use By.linkText

module.exports.block = function(){
	return function(dir){
		describe("Log-in", function(){
			it("Log-in as test1", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost/web");
				helpers.waitElementVisible.call(self,By.css("#login"));
				helpers.fillInput.call(self,b.findElement(By.css("#login")),"test1");
				helpers.fillInput.call(self,b.findElement(By.css("#pass")),"123456");
				b.findElement(By.css("button[class='btn btn-default']")).click();
				helpers.waitElementVisible.call(self,By.css("#logout"))
				b.findElement(By.css("#logout")).click();
				helpers.waitElementVisible.call(self,By.css("#login"));
				self.done();
			});
		});
	}
};
