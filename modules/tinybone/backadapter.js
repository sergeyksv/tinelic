define(["module","backctx"],function (module,ctx) {
	if (typeof window == 'undefined') {
		return function (f, t, p, cb) {
			var rpc = f.split(".");
			ctx.api[rpc[0]][rpc[1]](t,p,cb);
		}
	} else {
		return function (f, t, p, cb) {
			var rpc = f.split(".");
			$.ajax(ctx+t+"/"+rpc[0]+"/"+rpc[1],{
				dataType: "json",
				data:p,
				success:function (data) {
					cb(null, data)
				},
				error: function (xhr) {
					cb(new Error(xhr.responseJSON.message));
				}
			})
		}
	}

})
