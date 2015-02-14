define(["module","backctx",'jquery','jquery-cookie'],function (module,ctx, $) {
	function CustomError (message, subject) {
		this.constructor.prototype.__proto__ = Error.prototype;
		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
		this.subject = subject;
	}

	if (typeof window == 'undefined') {
		return function (f, t, p, cb) {
			var rpc = f.split(".");
			ctx.api[rpc[0]][rpc[1]](t.valueOf(),JSON.parse(JSON.stringify(p)),cb);
		}
	} else {
		var st = $.cookie("_t_state") || 1;

		var api = function (f, t, p, cb) {
			var rpc = f.split(".");
			p._t_st = st;
			$.ajax(ctx+t+"/"+rpc[0]+"/"+rpc[1],{
				type: (rpc[1].search(/(^get)/) == -1)?"POST":"GET",
				dataType: "json",
				data:JSON.parse(JSON.stringify(p)),
				success:function (data) {
					cb(null, data)
				},
				error: function (xhr) {
					cb(new CustomError(xhr.responseJSON.message,xhr.responseJSON.subject));
				}
			})
		}

		api.invalidate = function () {
			st++; $.cookie("_t_state",st,{expired:null,path:"/"});
		}

		$(window).on("beforeunload", function (e) {
			// on leaving page (real redirect) drop current path in
			// short leaving cookie (1m)
			$.cookie("_t_refresh",window.location.pathname,{expired:new Date((new Date()).valueOf()+60*1000),path:"/"});
		})

		// detection of page refresh
		if ($.cookie("_t_refresh")==window.location.pathname)
			api.invalidate();

		return api;
	}

})
