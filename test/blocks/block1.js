"use strict";

var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var safe = require('safe');
var _ = require('lodash');
var helpers = require('../helpers');

module.exports.block = function(){
	return function(dir){
		describe("Log-in", function(){
			it("Log-in as admin", function (done) {
				var self = this, b = self.browser, pid = null;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.css('#pass')).sendKeys("tinelic");
					b.findElement(By.css("#login")).sendKeys("admin");
					b.findElement(By.css("button.btn")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {
						b.findElement(By.css("#logout")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							helpers.waitElementVisible.call(self,By.css("#login"));
							self.done();
						})
					})
				})
			});
			it("Log-in as new user", function (done) {
				var self = this, b = self.browser, pid = null;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.css('#pass')).sendKeys("tinelic");
					b.findElement(By.css("#login")).sendKeys("admin");
					b.findElement(By.css("button.btn")).click();

					b.get("http://localhost/web/users");
					helpers.waitPageReload.call(self, null).then(function (pid) {
						b.findElement(By.css("button#addnu")).click();
						b.findElement(By.css('input#firstname')).sendKeys("obram");
						b.findElement(By.css('input#lastname')).sendKeys("tinelic");
						b.findElement(By.css('input#login')).sendKeys("obram");
						b.findElement(By.css('button#role')).click();
						b.findElement(By.css('.li-role')).click("admin");
						b.findElement(By.css('input#userpass')).sendKeys("123456");
						b.findElement(By.css('input#userrpass')).sendKeys("123456");
						b.findElement(By.css("button#savebtn")).click();
						helpers.waitPageReload.call(self, pid).then(function (pid) {
							b.findElement(By.css("#logout")).click();

							helpers.waitPageReload.call(self, pid).then(function (pid) {

								helpers.waitElementVisible.call(self,By.css("#login"));
								b.findElement(By.css('#pass')).sendKeys("123456");
								b.findElement(By.css("#login")).sendKeys("obram");
								b.findElement(By.css("button.btn")).click();
								self.done();
							})
						})
					})
				})
			});
		});
	}
};
