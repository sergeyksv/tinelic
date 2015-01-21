define(["module","backctx"],function (module,ctx) {
	if (typeof window == 'undefined') {
		return function (f, t, p, cb) {
			var rpc = f.split(".");
			ctx.api[rpc[0]][rpc[1]](t,p,cb);
		}
	} else {
		function setCookie(c_name, value, seconds, path) {
            var exdate = new Date();
            if (seconds)
				exdate = new Date(exdate.valueOf()+seconds*1000);
            var c_value = escape(value) + ((seconds == null) ? "" : "; expires=" + exdate.toUTCString());
            (path) && (c_value += ";path="+path);
            document.cookie = c_name + "=" + c_value;
        }

		function getCookie(c_name) {
			var i, x, y, ARRcookies = document.cookie.split(";");
			for (i = 0; i < ARRcookies.length; i++) {
				x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
				y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
				x = x.replace(/^\s+|\s+$/g, "");
				if (x == c_name) {
					return unescape(y);
				}
			}
		}

		var st = getCookie("_t_state") || 1;
		var page = getCookie("_t_page");

		if (page == location.pathname) {
			st++; setCookie("_t_state",st,null,"/");
		}

		$(window).on("unload", function() {
			setCookie("_t_page", location.pathname, 30, "/");
		})

		var api = function (f, t, p, cb) {
			var rpc = f.split(".");
			p._t_st = st;
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

		api.invalidate = function () {
			st++; setCookie("_t_state",st,null,"/");
		}
		return api;
	}

})
