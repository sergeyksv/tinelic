define(['require',"tinybone/backadapter", "safe","lodash","feed/mainres","moment/moment"], function (require,api,safe,_,feed,moment) {
	return function (req, res, cb) {
		var quant = res.locals.quant,
			dta,
			dtp;

		safe.parallel({
			view:function (cb) {
				require(["views/project/project"], function (view) {
					safe.back(cb, null, view);
				},cb);
			},
			data:function (cb) {
				api("assets.getProject",res.locals.token, {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
					var projects=[]; projects[0]=project;
					var dt = res.locals.dtstart;
					var dtp = (project._dtPagesErrAck || dt).valueOf();
					var dta = (project._dtActionsErrAck || dt).valueOf();
					res.locals.dtcliack = dtp;
					res.locals.dtseack = dta;
					api("web.getFeed",res.locals.token, {_t_age:quant+"m", feed:"mainres.projectInfo", params:{quant:quant,
						filter:{
							_idp:project._id,
							_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
						},
						_dtActionsErrAck: (dta < dt)?dta:dt,
						_dtPagesErrAck: (dtp < dt)?dtp:dt
					}}, safe.sure(cb, function (r) {
						cb(null,_.extend(r, {project:project}));
					}));
				}));
			}
		}, safe.sure(cb, function (r) {
			var filter = {
				_t_age: quant + "m", quant: quant,
				filter: {
					_dt: {$gt: res.locals.dtstart,$lte:res.locals.dtend}
				}
			};
			var views = {total:{}}; // total | server | browser | transaction | page | ajax
			var valtt; var vale; var valr; var valapd; var period, progress;

			if (r.data.views.length) {
				valtt = vale = valr = valapd = 0;
				period = r.data.views.length;
				_.forEach(r.data.views, function (v) {
					v = v.value;
					valr+=v.r;
					valtt+=v.tta;
					vale+=v.e;
					valapd+=v.apdex;
				});

				valtt=valtt/period/1000;
				valr=valr/period;
				vale=vale/period/valr;
				valapd=valapd/period;
				_.extend(views.total,{rpm: valr, errorpage: vale, etupage: valtt, apdclient: valapd});

			}
			if (r.data.actions.length) {
				vale = valtt = vale = valr = valapd = 0;
				period = r.data.actions.length;
				_.forEach(r.data.actions, function (v) {
					v = v.value;
					vale+=v.e;
					valr+=v.r;
					valtt+=v.tta;
					valapd+=v.apdex;
				});

				valtt=valtt/period/1000;
				valr=valr/period;
				vale=vale/period/valr;
				valapd=valapd/period;
				_.extend(views.total,{rsm: valr, ttserver: valtt, apdserver: valapd, erroraction: vale,});

			}
			if (r.data.ajax.length) {
				valtt = vale = valr = valapd = 0;
				period = r.data.ajax.length;
				_.forEach(r.data.ajax, function (v) {
					v = v.value;
					valr+=v.r;
					valtt+=v.tta;
					vale+=v.e;
					valapd+=v.apdex;
				});

				valtt=valtt/period/1000;
				valr=valr/period;
				vale=vale/period/valr;
				valapd=valapd/period;
				_.extend(views.total,{ram: valr, errorajax: vale, etuajax: valtt, apdajax: valapd});

			}
			var total,data;
			if (r.data.errors.length) {
				views.browser = {};
				total = 0; var session = 0; var page = 0;
				r.data.errors = _.sortBy(r.data.errors, function (s) { return -1*s.stats.session*s.stats.pages; } );
				_.forEach(r.data.errors, function(r){
					total += r.stats.count;
					session += r.stats.session;
					page += r.stats.pages;
				});
				data = _.take(r.data.errors, 10);
				_.extend(views.browser,{err: data, total: total, session: session, page: page});
			}
			if (r.data.serverErrors.length) {
				views.serverErr = {};
				total = 0;
				r.data.serverErrors = _.sortBy(r.data.serverErrors, function (s) { return -1*s.stats.c; } );
				_.forEach(r.data.serverErrors, function(r) {
					total += r.stats.c;
				});
				data = _.take(r.data.serverErrors, 10);
				_.extend(views.serverErr,{sErr:data,total:total});
			}
			if (r.data.topAjax.length) {
				views.topa = {};
				views.topa.a = _.take(_.sortBy(r.data.topAjax, function(r) {
					return r.value.tt;
				}).reverse(),10);
				progress = 0;
				_.forEach(views.topa.a,function(r) {
					progress += r.value.tt;
				});
				_.forEach(views.topa.a, function(r) {
					r.value.progress = (r.value.tt/progress)*100;
					r.value.tta = r.value.tt/r.value.c/1000;
				});
			}
			if (r.data.topPages.length) {
				views.topp = {};
				views.topp.p = _.take(_.sortBy(r.data.topPages,function(r) {
					return r.value.tt;
				}).reverse(),10);
				progress=0;
				_.forEach(views.topp.p,function(r) {
					progress += r.value.tt;
				});
				_.forEach(views.topp.p, function(r) {
					r.value.progress = (r.value.tt/progress)*100;
					r.value.tta = r.value.tt/r.value.c/1000;
				});
			}
			if (r.data.topTransactions.length) {
				views.transactions = {};
				views.transactions.top = _.take(_.sortBy(r.data.topTransactions,function(r) {
					return r.value.tt;
				}).reverse(),10);
				progress = 0;
				_.forEach(views.transactions.top,function(r) {
					progress += r.value.tt;
				});
				_.forEach(views.transactions.top, function(r) {
					r.value.progress = (r.value.tt/progress)*100;
					r.value.tta = r.value.tt/r.value.c/1000;
				});
			}

			if (r.data.metrics) {
				if (!views.total)
					views.total = {};

				views.total.metrics = r.data.metrics;
			}

			var graphOn;
			if (r.data.views.length || r.data.ajax.length || r.data.actions.length)
				graphOn = {};

			if (r.data.views.length)
				graphOn.browser = 1;

			if (r.data.ajax.length)
				graphOn.ajax = 1;

			if (r.data.actions.length)
				graphOn.server = 1;

			if (r.data.database.length) {
				views.database = {};
				views.database.db = _.take(_.sortBy(r.data.database,function(r) {
					return r.value.tt;
				}).reverse(),10);
				progress = 0;
				_.forEach(views.database.db,function(r) {
					progress += r.value.tt;
				});
				_.forEach(views.database.db, function(r) {
					r.value.progress = (r.value.tt/progress)*100;
					r.value.avg = r.value.tt/r.value.c/1000;
				});
			}

			res.renderX({view:r.view,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name, stats: views, graphOn: graphOn, fr:filter})});
		}));
	};
});
