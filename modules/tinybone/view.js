define(['safe','lodash','dust','tinybone/dustxtra'],function (safe,_,dust) {
  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };


	var View = function(app) {
		this.app=app
	}

	View.prototype.id = "BaseView";

	View.prototype.getBaseTplCtx = function (cb) {
		var base = dust.makeBase({
			_t_app:this.app
		})
		safe.back(cb,null,base);
	}

	View.prototype.populateTplCtx = function (ctx, cb) {
		ctx = ctx.push({_t_view:this});
		if (this.data)
			ctx = ctx.push(this.data);
		safe.back(cb,null, ctx);
	}

	View.prototype.loadTpls = function (cb) {
		var self = this;
		var names = this.tpls || [this.id];
		if (typeof window == 'undefined') {
			var fs = require('fs');
			var path = require('path');
			safe.each(names, function (name, cb) {
				fs.readFile(path.resolve(self.app.getLocalPath(), "./templates",name+".dust"), safe.sure(cb, function (template) {
					dust.loadSource(dust.compile(template.toString(), name));
					cb();
				}))
			},cb)
		} else {
			safe.each(names, function (name, cb) {
				requirejs(["dustjs/"+name], function (template) {
					dust.loadSource(template);
					cb();
				},cb)
			},cb);
		}
	}

	View.prototype.render = function (cb) {
		var self = this;
		safe.parallel({
			context:function (cb) {
				self.getBaseTplCtx(safe.sure(cb, function (ctx) {
					self.populateTplCtx(ctx,cb)
				}))
			},
			tpls:function (cb) { self.loadTpls(cb) }
		}, safe.sure(cb, function (res) {
			dust.render(self.id,res.context, cb)
		}))
	}

	View.extend = extend;
	return View;
})
