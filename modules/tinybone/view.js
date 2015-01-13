define(['safe','lodash','dust'],function (safe,_,dust) {
	// Make sure dust.helpers is an object before adding a new helper.
	if (!dust.helpers)
		dust.helpers = {};

	dust.helpers.view = function(chunk, context, bodies, params) {
		return chunk.map(function(chunk) {
			requirejs(['views/'+params.name], function (View) {
				var view = new View({app:context.get('_t_app')});
				var parent = context.get('_t_view');
				view.data = params.data?context.get(params.data):null;
				parent.addSubView({view:view,name:params.name,data:params.data?params.data:"."});
				// need to overwrite getting base context
				// to current one, because it is subview
				view.getBaseTplCtx = function (cb) {
					safe.back(cb, null, context);
				}
				view.render(function (err,text) {
					chunk.end(text);
				})
			})
		});
	};

	dust.config.whitespace = true;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

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


var View = function(options) {
	this.parent = null;
	this.views = [];
	this.cid = _.uniqueId('v');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
}

// Cached regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// List of view options to be merged as properties.
var viewOptions = ['data', 'el', 'id', 'className', 'tagName', 'events','app'];

_.extend(View.prototype, Events, {
    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // postRender is function called in browser when DOM rendered and
    // views are bound. Redefine in your own views, but don't forget to
    // call base
	postRender:function () {
		this.delegateEvents();
		_.each(this.views, function (child) {
			child.view.postRender()
		})
	},

	// used internally to bind view to already available DOM model
	// based on wire data provided by server
	bindWire:function (wire, parent, ctx, cb) {
		var self = this;
		if (!parent) {
			parent = this;
			this.parent = null;
			this.$el = $(document.body);
			this.data = wire.data;
		} else {
			parent.views.push({view:self, name:wire.name, data:wire.data, cid:wire.cid});
			this.parent = parent;
			this.$el = parent.$el.find("#"+wire.cid);
			if (this.$el.length!=1)
				return safe.back(cb, new Error("View '"+wire.name+"' can't find its unique element"))
			this.data = _.isString(wire.data)?ctx.get(wire.data):wire.data;
		}

		safe.run(function(cb) {
			if (!ctx)
				self.getBaseTplCtx(cb);
			else
				cb(null, ctx)
		}, safe.sure(cb, function (ctx) {
			self.populateTplCtx(ctx,safe.sure(cb, function (ctx) {
				safe.each(wire.views, function (wireView,cb) {
					requirejs(["views/"+wireView.name], function (View) {
						var view = new View({app:self.app});
						view.bindWire(wireView, self, ctx, cb);
					}, cb)
				},cb)
			}))
		}))
	},

	bindDom:function ($parent) {
		var self = this;
		this.$el = $parent.find("#"+this.cid);
		if (this.$el.length!=1)
			throw new Error("View '"+wire.name+"' can't find its unique element");

		_.each(self.views, function (child) {
			child.view.bindDom(self.$el);
		})
	},

	addSubView:function (view) {
		view.parent = this;
		this.views.push(view);
	},

	// by convension this should return initial (root) dust content
	// which will be the base for actual rendeting
	getBaseTplCtx:function (cb) {
		var base = dust.makeBase({
			_t_app:this.app
		})
		safe.back(cb,null,base);
	},

	// used to populate base content by data that are specific for this this
	populateTplCtx:function (ctx, cb) {
		ctx = ctx.push({_t_view:this});
		if (this.data)
			ctx = ctx.push(this.data);
		safe.back(cb,null, ctx);
	},

	// ensures that all required templates for view are being loaded
	// inluding partials (then are not loaded in runtime)
	loadTpls:function (cb) {
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
				requirejs(["dustjs/"+name+"_tpl"], function (template) {
					dust.loadSource(template);
					cb();
				},cb)
			},cb);
		}
	},

	// renders inner view content (free form), unlikely need to be
	// redefined
	renderHtml:function (cb) {
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
	},

	// renders final view content including wrapper element (!!!)
	render:function (cb) {
		var self = this;
		this.renderHtml(safe.sure(cb, function (text) {
			cb(null,"<div id='"+self.cid+"'>"+text+"</div>");
		}))
	},

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
		this.removeChilds();
		this.$el.remove();
		this.stopListening();
		return this;
    },

    removeChilds: function () {
		_.each(this.views, function (child) {
			child.view.remove();
		})
		this.views = [];
		return this;
	},

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    }

})

View.extend = extend;

return View;
})
