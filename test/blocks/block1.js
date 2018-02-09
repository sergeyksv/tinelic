/*jslint node: true */
/*global describe, it*/
"use strict";

var webdriver = require("selenium-webdriver");
var By = webdriver.By;
var safe = require("safe");
var _ = require("lodash");
var helpers = require("../helpers");

module.exports.block = function(){
	return function(){
		describe("Create new user", function(){
			it("Log-in as admin", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost:8080/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {
						self.done();
					});
				});
			});
			it("Add user and logout", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);

				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.css("#navbar .doManageUsers")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.id("addnu")).click();

						helpers.waitModal.call(self, "New user").then(function () {
							b.findElement(By.id("firstname")).sendKeys("obram");
							b.findElement(By.id("lastname")).sendKeys("tinelic");
							b.findElement(By.id("login")).sendKeys("obram");
							b.findElement(By.id("userpass")).sendKeys("123456");
							b.findElement(By.id("userrpass")).sendKeys("123456");
							b.findElement(By.id("role")).click();
							b.findElements(By.className("li-role")).then(function (body) {
								body[body.length-1].click();
							});

							b.findElement(By.id("savebtn")).click();

							helpers.waitPageReload.call(self, pid).then(function (pid) {
								b.findElement(By.id("logout")).click();

								helpers.waitPageReload.call(self, pid).then(function (pid) {
									self.done();
								});
							});
						});
					});
				});
			});
			it("Log-in as new user", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("123456");
					b.findElement(By.id("login")).sendKeys("obram");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {
						b.findElement(By.id("logout")).click();
						self.done();
					});
				});
			});
		});

		describe("Create new team", function() {
			it("Log-in as admin and open teams page", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost:8080/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {
							self.done();
						});
					});
				});
			});

			it("Create team", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);

				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.className("doEditTeam")).click();

					helpers.waitModal.call(self,"Edit Team").then(function () {
						b.findElement(By.id("name")).sendKeys("NewTeam");
						b.findElement(By.className("do-save")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {
								helpers.waitPageReload.call(self, pid).then(function () {

							b.findElement(By.id("logout")).click();
							self.done();
						});
						});
					});
				});
			});
		});

		describe("Create new project", function() {
			it("Log-in as admin and open teams page", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost:8080/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {

					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {
							self.done();
						});
					});
				});
			});

			it("Create project", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);

				helpers.waitPageReload.call(self, null).then(function (pid) {

					b.findElement(By.className("doNewProject")).click();

					helpers.waitModal.call(self, "New project").then(function () {

						b.findElement(By.css("input#name")).sendKeys("NewProject");
						b.findElement(By.css(".do-save")).click();

						helpers.waitPageReload.call(self, pid).then(function () {
							helpers.waitPageReload.call(self, pid).then(function () {

							b.findElement(By.id("logout")).click();
							self.done();
							});
						});
					});
				});
			});
		});
		describe("Assigning user and project to team", function() {
			it("Login and open teams page", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost:8080/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {
						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {
							self.done();
						});
					});
				});
			});
			it("Assign project to team", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);

				helpers.waitPageReload.call(self,null).then(function(pid){

					b.findElement(By.xpath("(//*[contains(@class, 'doEditProjects')])[last()]")).click();

					helpers.waitElementVisible.call(self,By.className("tt-input"));

					b.findElement(By.className("tt-input")).sendKeys("NewProject");
					helpers.waitElementExist.call(self,By.className("tt-suggestion"));

					b.findElement(By.className("tt-suggestion")).click();

					b.findElement(By.className("doSave")).click();

					helpers.waitPageReload.call(self,pid).then(function(pid) {
						self.done();
					});
				});
			});
			it("Assign user to team", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);

				helpers.waitPageReload.call(self,null).then(function(pid){

					b.findElement(By.xpath("(//*[contains(@class, 'doEditUsers')])[last()]")).click();

					helpers.waitElementVisible.call(self,By.className("tt-input"));

					b.findElement(By.className("tt-input")).sendKeys("obram tinelic");

					helpers.waitElementExist.call(self,By.className("tt-suggestion"));
					b.findElement(By.className("tt-suggestion")).click();

					b.findElement(By.className("doSave")).click();

					helpers.waitPageReload.call(self,pid).then(function(pid){
						self.done();
					});
				});
			});
			it("Logout as just assigned user and notice team and project", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);

				helpers.waitPageReload.call(self,null).then(function(pid){
					b.findElement(By.id("logout")).click();

					helpers.waitPageReload.call(self,pid).then(function(pid){
						b.findElement(By.id("pass")).sendKeys("123456");
						b.findElement(By.id("login")).sendKeys("obram");
						b.findElement(By.id("signup")).click();
						helpers.waitPageReload.call(self,pid).then(function(pid) {

							b.findElement(By.css("#navbar .doGoHome")).click();

							helpers.waitPageReload.call(self,pid).then(function(pid) {
								helpers.waitElementVisible.call(self,By.linkText("NewProject"));
								b.findElement(By.linkText("NewProject")).click();
								helpers.waitPageReload.call(self,pid).then(function() {
									self.done();
								});
							});
						});
					});
				});
			});
		});
	};
};
