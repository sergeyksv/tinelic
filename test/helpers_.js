"use strict";

var webdriver = require('selenium-webdriver')
var By = webdriver.By;
var Key = webdriver.Key;
var assert = require("assert");
var _ = require("lodash");
var moment = require('moment');
moment.locale("en_GB");
var defTimeout = 12000;

module.exports.login = function (user, check) {
	this.browser.get("http://localhost/web");
	waitElementVisible.call(this, By.css("#login"));
	fillInput.call(this, this.browser.findElement(By.css("#login")), user.login);
	fillInput.call(this, this.browser.findElement(By.css("#pass")), user.pass);
	this.browser.findElement(By.css(".btn-default")).click();
	waitElementVisible.call(this, By.css("#logout"))
}

module.exports.loginFromMenu = function (user) {
	var self = this;
	waitPageLoaded.call(self);

	fillInput.call(self, self.browser.findElement(By.name("login")), user.login);
	fillInput.call(self, self.browser.findElement(By.name("password")), user.password);
	self.browser.findElement(By.css("#signin")).submit();

	waitPageLoaded.call(self);
	waitNoElement.call(self, By.name("login"));
}

module.exports.fillTranslationModal = function(modal,data){
	var self = this;

	fillInput.call(self, modal.findElement(By.css("[name=pt_BR]")), data.pt_BR);
	fillInput.call(self, modal.findElement(By.css("[name=en_US]")), data.en_US);
	fillInput.call(self, modal.findElement(By.css("[name=de_DE]")), data.de_DE);

	modal.findElement(By.name("save")).click();
}

var fillInput = function(input, val) {
	var self = this;
	self.browser.wait(function () {
		return input.isDisplayed().then(function (isDisplayed) {
			return isDisplayed && input.getCssValue("opacity").then(function (v) { return v==1; });
		})
	}, defTimeout);

	input.getAttribute("class").then(function (cl){
		if (cl && cl.indexOf("date") !== -1)
			self.browser.executeScript("$(arguments[0]).val(arguments[1]).keyup().change()",input,moment.utc(val, 'L').format('DD MMM YYYY'));
		else
			self.browser.executeScript("$(arguments[0]).val(arguments[1]).keyup().change()",input,val);
	});
};

module.exports.fillInput = fillInput;

module.exports.blurFocus = function(input){
	input.sendKeys(Key.TAB);
}

module.exports.waitElementExist = function (selector, hint, timeout) {
	var self = this;
	hint = hint || '';	timeout = timeout || 10000;
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector)
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete, wait fail for "+selector) } )
};

module.exports.waitElement = function (selector, hint, timeout) {
	var self = this;
	hint = hint || ''; timeout = timeout || defTimeout;
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector).then(function (isPresent) {
			return !!isPresent;
		})
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete, wait fail for "+selector) } )
};

var waitNoElement = function (selector, hint, timeout) {
	var self = this;
	hint = hint || ''; timeout = timeout || defTimeout;
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector).then(function (isPresent) {
			return !isPresent;
		})
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete, wait fail for "+selector) } )
};

module.exports.waitNoElement = waitNoElement;

var waitUnblock = function (timeout) {
	var self = this;
	timeout = timeout || defTimeout;
	self.browser.wait(function () {
		return self.browser.isElementPresent(By.xpath("//div[@class='blockUI blockOverlay']")).then(function (isPresent) {
			return !isPresent;
		})
	}, timeout).thenCatch(function () { throw new Error(" didn't complete, wait fail for unblock") } )
};

module.exports.waitUnblock = waitUnblock;

var waitElementVisible = function (selector, hint, timeout) {
	var self = this;
	hint = hint || ''; timeout = timeout || defTimeout;
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector).then(function (isPresent) {
			if (!isPresent) return false;
			var e = self.browser.findElement(selector);
			return e.isDisplayed().then(function (isDisplayed) {
				return isDisplayed && e.getCssValue("opacity").then(function (v) { return v==1; });
			})
		})
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete, wait fail for "+selector) } )
};

module.exports.waitElementVisible = waitElementVisible;

module.exports.waitTextInElement = function (selector,text,timeout){
	var self = this;
	timeout = timeout || defTimeout;
	self.browser.wait(function () {
		return self.browser.findElement(selector).getText().then(function (val){
			return val == text;
		})
	},timeout).thenCatch(function () { throw new Error("Text '"+text+"' not found in element with "+selector) } )
};

function waitPageLoaded(timeout){
	var self = this;

	timeout = timeout || defTimeout;
	self.browser.sleep(100);

	self.browser.wait(function () {
		return self.browser.executeScript("return document.readyState").then(function(state){
			return state == "complete";
		})
	}, timeout).thenCatch(function () { throw new Error("Page didn't complete loaded") } )
	waitElementVisible.call(self, By.css("main"));
};

module.exports.waitPageLoaded = waitPageLoaded;

module.exports.runModal = function (selector, run) {
	var self = this;
	selector = selector || By.css('.modal:not(#livechat)');
	waitElementVisible.call(self, selector);

	self.browser.sleep(5); // wait bootstrap animation
	self.browser.findElement(selector).then(function (modal) {
		run(modal);
		waitNoElement.call(self, selector);
		waitNoElement.call(self, By.css('.modal-backdrop'));
		self.browser.sleep(5);
	});
}

module.exports.waitAnimationDone = function (selector) {
	this.browser.sleep(300); // need to refact to normal waiter!
}