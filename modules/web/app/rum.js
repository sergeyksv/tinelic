(function () {
	var softStart = new Date();
	var domReady = null;

	function domEvent() {
		domReady = new Date();
	}

	function getCookie(name) {
		var matches = document.cookie.match(new RegExp(
			"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
		));
		return matches ? decodeURIComponent(matches[1]) : undefined;
	}

	function loadEvent() {
		var _t_page = softStart;
		var _t_load = new Date();
		var _t_rum = parseInt(getCookie("_t_rum"));
		if (_t_rum) {
			_t_rum = new Date(_t_rum);
			if (_t_rum.valueOf()-softStart.valueOf()<60000)
				softStart = _t_rum;
		}

		var _t_start = (performance && performance.timing && performance.timing.navigationStart) || softStart;
		var _t_ready = (performance && performance.timing && performance.timing.domComplete) || domReady;

		var m = {
			_i_nt:_t_page.valueOf()-_t_start.valueOf(),
			_i_dt:_t_ready.valueOf()-_t_page.valueOf(),
			_i_lt:_t_load.valueOf()-_t_ready.valueOf(),
		}
		window.Tinelic.pageLoad(m);
	}

	function watchReady() {
		if ( document.addEventListener ) {
			document.addEventListener( "DOMContentLoaded", function(){
				document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
				domEvent();
			}, false );
		} else if ( document.attachEvent ) {
			document.attachEvent("onreadystatechange", function(){
				if ( document.readyState === "complete" ) {
					document.detachEvent( "onreadystatechange", arguments.callee );
					domEvent();
				}
			});

			if ( document.documentElement.doScroll && window == window.top ) (function(){
				try {
					document.documentElement.doScroll("left");
				} catch( error ) {
					setTimeout( arguments.callee, 0 );
					return;
				}
				domEvent()
			})();
		}
	}
	watchReady();

	var oldonload = window.onload;
	if (typeof window.onload != 'function') {
		window.onload = loadEvent;
	} else {
		window.onload = function() {
			loadEvent();
			if (oldonload) {
				oldonload();
			}
		}
	}

	window.addEventListener("beforeunload", function (e) {
		if (performance && performance.timing && performance.timing.navigationStart)
			return;
		var start = new Date().valueOf();
		var ttl = new Date(start+60000);

		document.cookie = '_t_rum='+(new Date().valueOf())+";expires="+ttl+";path=/";
	})

	window.Tinelic = {
		config:function (opts) {
			this.url = opts.url;
			this._dtp = opts._dtp;
			this.route = opts.route;
		},
		pageLoad:function (m) {
			m.p = window.location.pathname;
			m._dt = new Date();
			m._dtp = this._dtp;
			m.r = m.r || this.route;
			m._i_tt = m._i_nt+m._i_dt+m._i_lt;
			var i = new Image();
			var params = "?";
			for (var v in m) {
				params+=v+"="+m[v]+"&";
			}
			i.src = this.url+params;
		}
	}
})()
