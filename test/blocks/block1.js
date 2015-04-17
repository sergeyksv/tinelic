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
					b.findElement(By.css("#signup")).click();

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
					b.findElement(By.css("#signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageUsers")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.css("#addnu")).click();

							helpers.waitModal.call(self, By.css(".modal-dialog")).then(function () {
								b.findElement(By.css('input#firstname')).sendKeys("obram");
								b.findElement(By.css('input#lastname')).sendKeys("tinelic");
								b.findElement(By.css('input#login')).sendKeys("obram");
								b.findElement(By.css('button#role')).click();
								b.findElements(By.css('.li-role')).then(function (body) {
									body[body.length-1].click()
								})
								b.findElement(By.css('input#userpass')).sendKeys("123456");
								b.findElement(By.css('input#userrpass')).sendKeys("123456");
								b.findElement(By.css("button#savebtn")).click();

								helpers.waitPageReload.call(self, pid).then(function (pid) {
									b.findElement(By.css("#logout")).click();

									helpers.waitPageReload.call(self, pid).then(function (pid) {

										b.findElement(By.css('#pass')).sendKeys("123456");
										b.findElement(By.css("#login")).sendKeys("obram");
										b.findElement(By.css("#signup")).click();

										helpers.waitPageReload.call(self, pid).then(function (pid) {
											b.findElement(By.css("#logout")).click();
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
				var self = this, b = self.browser, pid = null;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.css('#pass')).sendKeys("tinelic");
					b.findElement(By.css("#login")).sendKeys("admin");
					b.findElement(By.css("#signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.css("#addnt")).click();

							helpers.waitModal.call(self, By.css(".modal-dialog")).then(function () {
								b.findElement(By.css('input#name')).sendKeys("NewTeam");
								b.findElement(By.css("button#savebtn")).click();

									helpers.waitPageReload.call(self, pid).then(function (pid) {
										b.findElement(By.css("#logout")).click();
										self.done();
									})
							})
						})
					})
				})
			});
			it("Creation of new project", function (done) {
				var self = this, b = self.browser, pid = null;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.css('#pass')).sendKeys("tinelic");
					b.findElement(By.css("#login")).sendKeys("admin");
					b.findElement(By.css("#signup")).click();

					helpers.waitPageReload.call(self, pid).then(function (pid) {

						b.findElement(By.css("#navbar .doManageTeams")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.css(".doNewProject")).click();

							helpers.waitModal.call(self, By.css(".modal-dialog")).then(function () {

								b.findElement(By.css('input#name')).sendKeys("NewProject");
								b.findElement(By.css("button.do-save")).click();

								helpers.waitPageReload.call(self, pid).then(function (pid) {
									b.findElement(By.css("#logout")).click();
									self.done();
								})
							})
						})
					})
				})
			});
			it("Creation of assign project and team to user", function (done) {
				var self = this, b = self.browser, pid = null;
				self.trackError(done);
				b.get("http://localhost/web/");
				helpers.waitPageReload.call(self, null).then(function (pid) {
					b.findElement(By.css('#pass')).sendKeys("tinelic");
					b.findElement(By.css("#login")).sendKeys("admin");
					b.findElement(By.css("#signup")).click();

						helpers.waitPageReload.call(self, pid).then(function (pid) {

							b.findElement(By.css("#navbar .doManageTeams")).click();

							helpers.waitPageReload.call(self, pid).then(function (pid) {

								b.findElements(By.css(".actions")).then(function (body) {
									body[body.length-1].click()
								})
								b.findElements(By.css("#li-add-project")).then(function (body) {
									body[body.length-1].click()
								})

								helpers.waitModal.call(self, By.css(".modal-dialog")).then(function () {
									b.findElements(By.css(".cb-ap")).then(function (body) {
										body[body.length-1].click()
									})
									b.findElement(By.css("#btn-add-project")).click();

									helpers.waitPageReload.call(self, pid).then(function (pid) {
										b.findElements(By.css(".actions")).then(function (body) {
											body[body.length-1].click()
										})
										b.findElements(By.css("#li-add-user")).then(function (body) {
											body[body.length-1].click()
										})

										helpers.waitModal.call(self, By.css(".modal-dialog")).then(function () {
											b.findElements(By.css(".cb-au")).then(function (body) {
												body[body.length-1].click()
											})
											b.findElements(By.css('button.btn.btn-info')).then(function (body) {
												body[body.length-1].click()
											})
											b.findElements(By.css('.li-role')).then(function (body) {
												body[body.length-2].click()
											})
											b.findElement(By.css("#btn-add-users")).click();

											helpers.waitPageReload.call(self, pid).then(function (pid) {
												b.findElement(By.css("#logout")).click();

												helpers.waitPageReload.call(self, pid).then(function (pid) {

													b.findElement(By.css('#pass')).sendKeys("123456");
													b.findElement(By.css("#login")).sendKeys("obram");
													b.findElement(By.css("#signup")).click();
													self.done();
												})
											})
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
