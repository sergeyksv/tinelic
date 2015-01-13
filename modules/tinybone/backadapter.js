define(["module"],function (module) {
	return function (f, t, p, cb) {
		var rpc = f.split(".");
		if (typeof window == 'undefined') {
			requirejs(["backctx"], function (ctx) {
				ctx.api[rpc[0]][rpc[1]](t,p,cb);
			}, cb);
		} else {
			$.getJSON("/restapi/"+t+"/"+rpc[0]+"/"+rpc[1],p,function (data) {
				cb(null, data)
			})
		}
	}
})
