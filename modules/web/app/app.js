define(['views/layout','module','safe',"dust","tinybone/base","routes"],function (Layout,module,safe,dust,tb,routes) {
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
		init:function(wire, next) {
			this.prefix = wire.prefix;
			var self = this;
			this.router = new tb.Router({
				prefix:module.uri.replace("app/app.js",""),
				render:function (route) { self.clientRender(route) },
				errHandler:this.errHandler,
				routes:routes
			})
			this.router.on("start", function (route) {
				self._pageLoad = {start:new Date(),route:route.route};
			})
			next || (next = this.errHandler);
			this.mainView || (this.mainView = new Layout({app:this}));
			var mainView = this.mainView;
			mainView.bindWire(wire, null, null, safe.sure(next, function () {
				mainView.postRender();
			}))
		},
		clientRender:function (route, next) {
			this._pageLoad.data = new Date();
			next || (next = this.errHandler);
			var self = this;
			this.mainView || (this.mainView = new Layout({app:this}));
			var mainView = this.mainView;
			requirejs(['views/'+route.view], function (View) {
				var view = new View({app:self});
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
					window._t_pageLoad(m);
				}))
			},next)

		}
	})
})
