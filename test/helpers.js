var webdriver = require('selenium-webdriver')
var By = webdriver.By;
var Key = webdriver.Key;
var assert = require("assert");
var _ = require("lodash");
var fs = require('fs');


module.exports.fillInput = function(input,val) {
	var self = this;
	var i = 0;
	self.browser.wait(function () {
		return input.isDisplayed();
	});
	input.getAttribute("class").then(function (cl){
		if (cl && cl.indexOf("date") !== -1)
			self.browser.executeScript("$(arguments[0]).val(arguments[1]).keyup().change()",input,moment.utc(val, 'L').format('DD MMM YYYY'));
		else
			self.browser.executeScript("$(arguments[0]).val(arguments[1]).keyup().change()",input,val);
	});
};

module.exports.blurFocus = function(input){
	input.sendKeys(Key.TAB);
}

module.exports.runModal = function (selector, run) {
	var self = this;
	selector = selector || By.css('.modal:not(#livechat)');
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector)
	});
	self.browser.findElement(selector).then(function (modal) {
		var id;
		modal.getAttribute("id").then(function(text){
			id = text;
		});
		self.browser.wait(function () {
			return modal.getCssValue("opacity").then(function (v) { return v==1; });
		});
		run(modal);

		self.browser.wait(function () {
			return self.browser.isElementPresent(By.id(id)).then(function (isPresent)
				{ return !isPresent; } );
		});
		self.browser.sleep(256);
	});
}

module.exports.waitNoElement = function (element) {
	var self = this;
	self.browser.wait(function () {
		return self.browser.isElementPresent(element).then(function (isPresent)
			{ return !isPresent; } );
	});
};

module.exports.waitElementExist = function (selector, hint, timeout) {
	var self = this;
	hint = hint || '';	timeout = timeout || 10000;
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector)
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete, wait fail for "+selector) } )
};

module.exports.waitElementVisible = function (selector, hint, timeout) {
	var self = this;
	hint = hint || '';	timeout = timeout || 15000;
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector).then(function (isPresent) {
			if (!isPresent) return false;
			var e = self.browser.findElement(selector);
			return e.isDisplayed().then(function (isDisplayed) {
				if (!isDisplayed) return false;
				return e.getCssValue("opacity").then(function (v) { return v==1; });
			})
		})
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete, wait fail for "+selector) } )
};

module.exports.waitPageReload = function (old_id) {
	var b = this.browser;
	var new_id;
	return b.wait(function() {
		return b.findElement(By.css("body")).then(function (body) {
			return body.getAttribute("data-id").then(function(text){
				new_id = text;
				return old_id != text;
			})
		}).then(null, function (err) {
			return false;
		})
	}).then(function () {
		return new_id;
	})
}

module.exports.waitUnblock = function (hint, timeout) {
	hint = hint || '';	timeout = timeout || 15000;
	var self = this;
	self.browser.wait(function () {
		return self.browser.isElementPresent(By.xpath("//div[@class='blockUI blockOverlay']")).then(function (isPresent)
			{ return !isPresent; } );
	}, timeout).thenCatch(function () { throw new Error(hint+" didn't complete") } )
};

module.exports.reportError = function (err) {
	return function () {
		throw new Error(err)
	}
}

module.exports.takeScreenshot = function (file) {
	return this.browser.takeScreenshot().then(function(data) {
		fs.writeFileSync(file || "./screenshot.png", data.replace(/^data:image\/png;base64,/,''), 'base64')
	})
}
