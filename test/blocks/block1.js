"use strict";

var webdriver = require("selenium-webdriver");
var By = webdriver.By;
var safe = require("safe");
var _ = require("lodash");
var helpers = require("../helpers");

module.exports.block = function(){
	return function(){
		describe("Log-in", function(){
			it("Log-in as admin", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {
						b.findElement(By.id("logout")).click();

						helpers.waitPageReload.call(self, pid).then(function () {

							helpers.waitElementVisible.call(self,By.id("login"));
							self.done();
						})
					})
				})
			});
			it("Log-in as new user", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageUsers")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.id("addnu")).click();

							helpers.waitModal.call(self, By.id("settings")).then(function () {
								b.findElement(By.id("firstname")).sendKeys("obram");
								b.findElement(By.id("lastname")).sendKeys("tinelic");
								b.findElement(By.id("login")).sendKeys("obram");
								b.findElement(By.id("role")).click();
								b.findElements(By.className("li-role")).then(function (body) {
									body[body.length-1].click()
								});
								b.findElement(By.id("userpass")).sendKeys("123456");
								b.findElement(By.id("userrpass")).sendKeys("123456");
								b.findElement(By.id("savebtn")).click();

								helpers.waitPageReload.call(self, pid).then(function (pid) {
									b.findElement(By.id("logout")).click();

									helpers.waitPageReload.call(self, pid).then(function (pid) {

										b.findElement(By.id("pass")).sendKeys("123456");
										b.findElement(By.id("login")).sendKeys("obram");
										b.findElement(By.id("signup")).click();

										helpers.waitPageReload.call(self, pid).then(function () {
											b.findElement(By.id("logout")).click();
											self.done();
										})
									})
								})
							})
						})
					})
				})
			});

			it("Creation of new team", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.id("addnt")).click();

							helpers.waitModal.call(self, By.css(".modal.fade")).then(function () {
								b.findElement(By.id("name")).sendKeys("NewTeam");
								b.findElement(By.id("savebtn")).click();

									helpers.waitPageReload.call(self, pid).then(function () {
										b.findElement(By.id("logout")).click();
										self.done();
									})
							})
						})
					})
				})
			});
			it("Creation of new project", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.className("doNewProject")).click();

							helpers.waitModal.call(self, By.css(".modal-dialog")).then(function () {

								b.findElement(By.css("input#name")).sendKeys("NewProject");
								b.findElement(By.css(".do-save")).click();

								helpers.waitPageReload.call(self, pid).then(function () {
									b.findElement(By.id("logout")).click();
									self.done();
								})
							})
						})
					})
				})
			});
			it("Creation of assign project and team to user", function (done) {
				var self = this, b = self.browser;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.id("pass")).sendKeys("tinelic");
					b.findElement(By.id("login")).sendKeys("admin");
					b.findElement(By.id("signup")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.css("#navbar .doManageTeams")).click();

							helpers.waitPageReload.call(self, pid).then(function (pid) {

								b.findElements(By.className("edit-projects")).then(function (body) {
									body[body.length-1].click()
								});

								b.findElements(By.className("save-projects")).then(function(body){
									body[body.length-1].click();
								});

								helpers.waitPageReload.call(self, pid).then(function (pid) {

									b.findElements(By.className("edit")).then(function (body) {
										body[body.length-1].click()
									});

									b.findElements(By.className("tt-input")).then(function(body){
										body[body.length-1].sendKeys("obram tinelic")
									});

									b.findElements(By.className("save-user")).then(function (body) {
										body[body.length-1].click()
									});

									helpers.waitPageReload.call(self,pid).then(function(pid){

										b.findElement(By.id("logout")).click();

										helpers.waitPageReload.call(self,pid).then(function(){
											b.findElement(By.id("pass")).sendKeys("123456");
											b.findElement(By.id("login")).sendKeys("obram");
											b.findElement(By.id("signup")).click();
											self.done();
										})
									})
								})

							})
						})
				})
			});
		})
	}
};
