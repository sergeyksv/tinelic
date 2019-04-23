define(["module","backctx",'tson','safe','jquery','jquery-cookie'],function (module,ctx,tson,safe,$) {
	var config = (module.config && module.config()) || {};

	function CustomError (message, subject) {
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, CustomError);
		} else {
			Error.call(this, message);
		}

		this.name = 'CustomError';
		this.message = message;
		this.subject = subject;
	}

	function ValidationError(message, subject, data) {
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ValidationError);
		} else {
			Error.call(this, message);
		}

		this.name = 'ValidationError';
		this.message = message;
		this.subject = subject;
		this.data = data;
	}

	safe.inherits(CustomError, Error);
	safe.inherits(ValidationError, Error);

	if (typeof window == 'undefined') {
		return function (f, t, p, cb) {
			p._t_son = p._t_son || config._t_son;
			var rpc = f.split(".");
			ctx.api[rpc[0]][rpc[1]](t.valueOf(),p,function (err, data){
				if (err)
					return cb(err);
				if (config.debug && (config._t_son || p._t_son) && !!data)  {
					// simulate wire
					cb(null,tson.decode(JSON.parse(JSON.stringify(tson.encode(data)))));
				} else
					cb(null,data);
			});
		};
	} else {
		var st = $.cookie("_t_state") || 1;

		var api = function (f, t, p, cb) {
			p._t_son = p._t_son || config._t_son;
			var rpc = f.split(".");
			p._t_st = st;
			var type = (rpc[1].search(/(^get)/) == -1)?"POST":"GET";
			try {
				if (type === "GET") {
					var size = JSON.stringify(p).length;
					if (size > 1024)
						type = "POST";
				}
			} catch (e) { /**/ }
			$.ajax(ctx+t+"/"+rpc[0]+"/"+rpc[1],{
				type: type,
				dataType: "json",
				data:(p._t_son == 'in' || p._t_son == 'both' )?tson.encode(p,true):p,
				success:function (data) {
					if (p._t_son == 'out' || p._t_son == 'both' )
						data = tson.decode(data);
					cb(null, data);
				},
				error: function (xhr, textStatus, errorThrown) {
					var err;

					if(xhr.status === 422) {
						err = new (Function.prototype.bind.apply(ValidationError, [null].concat(_.values(_.pick(xhr.responseJSON, ['message', 'subject', 'data'])))));
					} else {
						err = new CustomError(xhr.responseJSON?xhr.responseJSON.message:errorThrown,xhr.responseJSON?xhr.responseJSON.subject:textStatus);
					}

					cb(err);
				}
			});
		};

		api.invalidate = function () {
			st++; $.cookie("_t_state",st,{expired:null,path:"/"});
		};

		$(window).on("beforeunload", function (e) {
			// on leaving page (real redirect) drop current path in
			// short leaving cookie (1m)
			$.cookie("_t_refresh",window.location.pathname,{expired:new Date(Date.now()+60*1000),path:"/"});
		});

		// detection of page refresh
		if ($.cookie("_t_refresh")==window.location.pathname)
			api.invalidate();

		return api;
	}

});
