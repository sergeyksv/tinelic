define(['views/layout/layout','module','safe',"dust",
	"tinybone/base",
	"moment/moment",
	"lodash",
	"tinybone/backadapter",
	"jquery.blockUI"
],function (Layout,module,safe,dust,tb,moment,_) {
    // Make sure dust.helpers is an object before adding a new helper.
    if (!dust.helpers)
        dust.helpers = {};

	dust.helpers.formatdate = function(chunk, context, bodies, params) {
        var m = moment(new Date(params.date));
        var output = m.format(params.format || 'lll');
        return chunk.write(output);
	};
	dust.helpers.formatnumber = function(chunk, context, bodies, params) {
		var output="";
		if (params.type == "rpm") {
			if ((params.val/10000)>1.0){
				output = (Math.round(params.val/1000)).toString()+"k&nbsp;rpm";
			}
			else {
				output = params.val.toFixed(1).toString()+"&nbsp;rpm";
			}
			return chunk.write(output);
		}
		if (params.type == "reqs") {
			if ((params.val/10000)>1.0){
				output = (Math.round(params.val/1000)).toString()+"k";
			}
			else {
				output = Math.round(params.val).toString();
			}
			return chunk.write(output);
		}
		if (params.type == "tm") {
			if (params.val <0.1) {
				output = (Math.round(params.val*1000)).toString()+"&nbsp;ms";
			}
			else {
				output = params.val.toFixed(1).toString()+"&nbsp;s";
			}
			return chunk.write(output);
		}
		if (params.type == "erate") {
			output = params.val.toFixed(params.val<10?2:0).toString()+"&nbsp;%";

			return chunk.write(output);
		}
		if (params.type == "apdex") {
			output = params.val.toFixed(2).toString();
			return chunk.write(output);
		}
		if (params.type == "memory") {
			if ((params.val/1024) > 1.0){
				output = ((params.val/1024).toFixed(2)).toString()+"&nbsp;Gb";
			}
			else {
				output = params.val.toString()+"&nbsp;Mb";
			}
			return chunk.write(output);
		}
	};

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
			requirejs(routes, function (main) {
				// some standard locals grabber
				router.use(function (req,res, next) {
					res.locals.token = req.cookies.token || "public";
					res.locals._t_req = _.pick(req,['path','query','baseUrl']);
					var str = req.query._str || req.cookies.str || '1d';
					var range = 60 * 60 * 1000;

					// transcode range paramater into seconds
					var match = str.match(/(\d+)(.)/);
					var units = {
						h:60 * 60 * 1000,
						d:24 * 60 * 60 * 1000,
						w:7 * 24 * 60 * 60 * 1000
					};
					if (match.length==3 && units[match[2]])
						range = match[1]*units[match[2]];

					var tolerance = 10 * 60 * 1000;
					res.locals.dtend = parseInt(((new Date()).valueOf()+tolerance)/tolerance)*tolerance;
					res.locals.dtstart = res.locals.dtend - range;
					res.locals.header = {range:str};
					next();
				});
				// routes goes first
				router.get("/", main.index);
				router.get("/event/:id/:st", main.event);
				router.get("/event/:id", main.event);
				router.get("/server-error/:id", main.serror);
				router.get("/page", main.page);
				router.get("/project/:slug", main.project);
				router.get("/users", main.users);
				router.get("/project/:slug/ajax/:stats", main.ajax);
				router.get("/project/:slug/application/:stats", main.application);
				router.get("/project/:slug/pages/:stats", main.pages);
				router.get("/project/:slug/errors/:sort", main.errors);
				router.get("/project/:slug/errors/:sort/:id", main.errors);
				router.get("/project/:slug/database/:stats", main.database);
				router.get("/project/:slug/server_errors/:sort", main.server_errors);
				router.get("/project/:slug/server_errors/:sort/:id", main.server_errors);
				router.get("/project/:slug/settings", main.settings);
				router.get("/project/:slug/metrics", main.metrics);
				router.get("/teams", main.teams);

				// error handler after that
				router.use(function (err, req, res, cb) {
					if (err.subject) {
						if (err.subject == "Unauthorized") {
							requirejs(["views/signup/signup"], safe.trap(cb, function (view) {
								res.status(401);
								res.renderX({view: view, route: req.route.path, data: {title: "Sign UP"}});
							}), cb);
						} else if (err.subject == "Access forbidden") {
							res.redirect('/web/');
						} else
							cb(err);
					}
					else
						cb(err);
				});
				router.use(function (err, req, res, cb) {
					self.errHandler(err);
				});
				cb();
			},cb);
		},
		init:function(wire, next) {
			$.blockUI.defaults.message = "<h4>Loading ...</h4>";
			$.blockUI.defaults.overlayCSS = {
				backgroundColor: '#FFF',
				opacity:         0,
				cursor:          'wait'
			};
			this.prefix = wire.prefix;
			var self = this;
			this.router = new tb.Router({
				prefix:module.uri.replace("/app/app.js","")
			});
			this.router.on("start", function (route) {
				$.blockUI();
				self._pageLoad = {start:new Date(),route:route.route};
			});
			if (!next)
				next = this.errHandler;
			if (!this.mainView)
				this.mainView = new Layout({app:this});
			var mainView = this.mainView;
			this.router.use(function (req, res, next) {
				res.status = function () {};
				res.redirect = function (path) {
					self.router.navigateTo(path,{replace:true});
				};
				res.renderX = function (route) {
					self.clientRender(this,route);
				};
				next();
			});
			this.initRoutes(safe.sure(next, function () {
				mainView.bindWire(wire, null, null, safe.sure(next, function () {
					mainView.postRender();
					$('body').attr('data-id',(new Date()).valueOf());
				}));
			}));
		},
		clientRender:function (res, route, next) {
			var self = this;
			$.unblockUI();
			this._pageLoad.data = new Date();


			var mainView = this.mainView;
			var view = new route.view({app:self});
			view.data = route.data;
			var locals = mainView.locals;
			mainView.locals = res.locals;
			mainView.attachSubView(view);
			view.render(function (err, text) {
				if (err) {
					// santize
					mainView.detachSubView(view);
					mainView.locals = locals;
					return nexr(err);
				}
				var oldView = mainView.views[0];
				document.title = route.data.title;
				var $dom = $(text);
				$("#content").append($dom);
				view.bindDom($dom, oldView);
				oldView.remove();
				$('body').attr('data-id',(new Date()).valueOf());
				self._pageLoad.dom = new Date();
				var m = {
					_i_nt:self._pageLoad.data.valueOf()-self._pageLoad.start.valueOf(),
					_i_dt:self._pageLoad.dom.valueOf()-self._pageLoad.data.valueOf(),
					_i_lt:0,
					r:self._pageLoad.route
				};
				window.Tinelic.pageLoad(m);
			});
		}
	});
});
