define(["module","backctx",'jquery','jquery-cookie'],function (module,ctx, $) {
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
				dataType: "json",
				data:JSON.parse(JSON.stringify(p)),
				success:function (data) {
					cb(null, data)
				},
				error: function (xhr) {
					cb(new Error(xhr.responseJSON.message));
				}
			})
		}

		api.invalidate = function () {
			st++; $.cookie("_t_state",st,{expired:null,path:"/"});
		}
		return api;
	}

})
