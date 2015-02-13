define(['views/layout','module','safe',"dust"
	,"tinybone/base"
	,"moment/moment"
	,"lodash"
	,"tinybone/backadapter" // Important to get it on top level dependancy
],function (Layout,module,safe,dust,tb,moment,_) {
    // Make sure dust.helpers is an object before adding a new helper.
    if (!dust.helpers)
        dust.helpers = {};

	dust.helpers.formatdate = function(chunk, context, bodies, params) {
        var m = moment(new Date(params.date));
        var output = m.format(params.format || 'lll');
        return chunk.write(output);
	}

	return tb.Application.extend({
		getLocalPath:function () {
			return module.uri.replace("app.js","");
		},
		getView:function () {
			return new Layout({app:this});
		},
		errHandler: function (err) {
			if (err) console.log(err.stack);
		},
		initRoutes: function (cb) {
			var self = this;
			var router = self.router;
			var routes = ["routes/main"];
			router.use(function (err, req, res, next) {
				self.errHandler(err);
			})
			requirejs(routes, function (main) {
				router.get("/", main.index);
				router.get("/event/:id", main.event);
				router.get("/page", main.page);
				router.get("/project/:slug", main.project);
				router.get("/users", main.users);
				router.get("/project/:slug/ajax_rpm", main.ajax_rpm);
				cb();
			},cb)
		},
		init:function(wire, next) {
			this.prefix = wire.prefix;
			var self = this;
			this.router = new tb.Router({
				prefix:module.uri.replace("app/app.js","")
			})
			this.router.on("start", function (route) {
				self._pageLoad = {start:new Date(),route:route.route};
			})
			next || (next = this.errHandler);
			this.mainView || (this.mainView = new Layout({app:this}));
			var mainView = this.mainView;
			this.router.use(function (req, res, next) {
				res.renderX = function (route) {
					self.clientRender(route);
				}
				next();
			})
			this.initRoutes(safe.sure(next, function () {
				mainView.bindWire(wire, null, null, safe.sure(next, function () {
					mainView.postRender();
				}))
			}))
		},
		clientRender:function (route, next) {
			this._pageLoad.data = new Date();
			next || (next = this.errHandler);
			var self = this;
			this.mainView || (this.mainView = new Layout({app:this}));
			var mainView = this.mainView;
			var view = new route.view({app:self});
			view.data = route.data;
			view.render(safe.sure(next, function (text) {
				document.title = route.data.title;
				mainView.removeChilds();
				$("#content").html(text);
				view.bindDom($("#content"));
				mainView.addSubView({view:view, name:route.view, cid:view.cid, data:view.data})
				view.postRender();
				self._pageLoad.dom = new Date();
				var m = {
					_i_nt:self._pageLoad.data.valueOf()-self._pageLoad.start.valueOf(),
					_i_dt:self._pageLoad.dom.valueOf()-self._pageLoad.data.valueOf(),
					_i_lt:0,
					r:self._pageLoad.route
				}
				window.Tinelic.pageLoad(m);
			}))
		}
	})
})
