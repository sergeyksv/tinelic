(function() {
    "use strict";
    var softStart = new Date();
    var domReady = null;

    function domEvent() {
        domReady = new Date();
    }

    function getCookie(name) {
        var matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    function loadEvent() {
        var _t_page = softStart;
        var _t_load = new Date();
        var _t_rum = parseInt(getCookie("_t_rum"), 10);
        if (_t_rum) {
            _t_rum = new Date(_t_rum);
            if (_t_rum.valueOf() - softStart.valueOf() < 60000) {
                softStart = _t_rum;
            }
        }

        var _t_start = (window.performance && performance.timing && performance.timing.navigationStart) || softStart;
        var _t_ready = (window.performance && performance.timing && performance.timing.domComplete) || domReady;

        var m = {
            _i_nt: _t_page.valueOf() - _t_start.valueOf(),
            _i_dt: _t_ready.valueOf() - _t_page.valueOf(),
            _i_lt: _t_load.valueOf() - _t_ready.valueOf(),
            r: window.Tinelic.route
        };

        window.Tinelic.pageLoad(m);
    }

    function watchReady() {
        if (document.addEventListener) {
            var ready1 = function() {
                document.removeEventListener("DOMContentLoaded", ready1, false);
                domEvent();
            };
            document.addEventListener("DOMContentLoaded", ready1, false);
        } else if (document.attachEvent) {
            var ready2 = function() {
                if (document.readyState === "complete") {
                    document.detachEvent("onreadystatechange", ready2);
                    domEvent();
                }
            };
            document.attachEvent("onreadystatechange", ready2);

            if (document.documentElement.doScroll && window == window.top) {
                var ready3 = function() {
                    try {
                        document.documentElement.doScroll("left");
                    } catch (error) {
                        setTimeout(ready3, 0);
                        return;
                    }
                    domEvent();
                };
                ready3();
            }
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
        };
    }

    var beforeUnload = function(e) {
        if (window.performance && performance.timing && performance.timing.navigationStart) {
            return;
        }
        var start = new Date().valueOf();
        var ttl = new Date(start + 60000);

        document.cookie = '_t_rum=' + (new Date().valueOf()) + ";expires=" + ttl + ";path=/";
    };

    if (window.addEventListener)
        window.addEventListener("beforeunload",beforeUnload);
    else
        window.attachEvent("beforeunload",beforeUnload);

    function sendPixel(m, u) {
        var i = new Image();
        var params = "?";
        for (var v in m) {
            params += v + "=" + encodeURIComponent(m[v]) + "&";
        }
        i.src = u + params;
        return i;
    }

    window.Tinelic = {
        config: function(opts) {
            this.url = opts.url;
            this._dtp = opts._dtp;
            this.route = opts.route;
            // support of newrelic style route decoding (when key is set)
            if (opts.key) {
                var _encoded = decode64(opts.route);
                var _key = opts.key;
                var _decoded = "";
                for( var i = 0; i < _encoded.length; i++ ) {
                    var _byte = _encoded.charCodeAt(i) ^ _key.charCodeAt(i % _key.length);
                    _decoded += String.fromCharCode( _byte );
                }
                this.route = _decoded.replace(/[^/]+\/[^/]+\//,'');
            }

            this.project = opts.project;
            this.ajaxCallback = opts.ajaxCallback;
            // work around for legacy initialization
            if (!this.project) {
                this.project = window.Tinelic.url.split('/')[5];
                this.url = this.url.replace("/collect/browser/" + this.project, "");
            }
        },
        pageLoad: function(m) {
            m.p = window.location.pathname + window.location.hash;
            m._dt = (new Date()).valueOf();
            m._dtp = this._dtp.valueOf();
            m.r = m.r || m.p;
            m._i_tt = m._i_tt || m._i_nt + m._i_dt + m._i_lt;
            sendPixel(m, this.url + "/collect/browser/" + this.project);
        },
        clientRequest: function(s) {
            // route, url and total time or all time components are required
            if (!(s.r && s.url && (!isNaN(s._i_tt) || (!isNaN(s._i_nt) && !isNaN(s._i_pt))))) {
                return;
            }
            s._dtp = this._dtp;
            s._dtc = new Date();
            s._i_code = s._i_code || 200;

            if (s._i_tt) {
                s._i_pt = s._i_pt || 0;
                s._i_nt = s._i_nt || s._i_tt - s._i_pt;
            } else {
                s._i_tt = s._i_nt + s._i_pt;
            }
            sendPixel(s, this.url + "/collect/ajax/" + this.project);
        }
    };

    var xml_type;

    if (window.XMLHttpRequest && !(window.ActiveXObject)) {
        xml_type = 'XMLHttpRequest';
    }
    if (xml_type == 'XMLHttpRequest') {

        var xhrwrapper = function(XHR) {
            var open = XHR.prototype.open;
            var send = XHR.prototype.send;
            XHR.prototype.open = function() {
                this._url = arguments[1];
                open.apply(this, arguments);
            };
            XHR.prototype.send = function(data) {
                var self = this;
                var url = this._url;
                var should = true;

                // bypass instrumentation for some specific urls
                should = !(url.match(/localhost:0/) || url.match(/optimizely\.com/));

				// bypass CORS calls
                should = should && !(url.indexOf("://")!=-1 && url.indexOf(window.location.host)==-1);

                if (should) {
                    var start = (new Date()).valueOf();
                    var oldOnReadyStateChange;
                    var s = {
                        _i_nt: 0
                    };
                    var jsonrpcMethod;
                    if (data && typeof data == "string") {
                        var jsonData;
                        try {
                            jsonData = JSON.parse(data);
                        } catch (e) {}
                        if (jsonData && jsonData.jsonrpc) {
                            jsonrpcMethod = jsonData.method;
                        }
                    }

                    var onReadyStateChange = function () {
                        var time = new Date() - start;
                        if (self.readyState == 2) {
                            s._i_nt = time;
                        }
                        if (self.readyState == 4 ) {
                            s._i_tt = time;
                            s._i_pt = s._i_tt - s._i_nt;
                            s.url = url;
                            s.r = url.replace(/\?.*/, "");
                            if (jsonrpcMethod) {
                                s.r += (s.r[s.r.length - 1] == "/" ? "" : "/") + jsonrpcMethod;
                            }
                            if (typeof window.Tinelic.ajaxCallback != 'undefined') {
                                window.Tinelic.ajaxCallback(s, XHR, data);
                            }
                            s._i_code = self.status;
                            s._dtc = (new Date()).valueOf();
                            s._dtp = window.Tinelic._dtp.valueOf();
                            sendPixel(s, window.Tinelic.url + "/collect/ajax/" + window.Tinelic.project);

                        }
                        if (oldOnReadyStateChange) {
                            oldOnReadyStateChange();
                        }
                    };
                    if (this.addEventListener) {
                        this.addEventListener("readystatechange", onReadyStateChange, false);
                    } else {
                        oldOnReadyStateChange = this.onreadystatechange;
                        this.onreadystatechange = onReadyStateChange;
                    }
                }

                send.call(this, data);
            };
        };
        xhrwrapper(XMLHttpRequest);
    }

    var base64_key_str = "ABCDEFGHIJKLMNOP" + "QRSTUVWXYZabcdef" + "ghijklmnopqrstuv" + "wxyz0123456789+/" + "=";
	function decode64(input) {
		var output = "";
		var chr1, chr2, chr3 = "";
		var enc1, enc2, enc3, enc4 = "";
		var i = 0;
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		do {
			enc1 = base64_key_str.indexOf(input.charAt(i++));
			enc2 = base64_key_str.indexOf(input.charAt(i++));
			enc3 = base64_key_str.indexOf(input.charAt(i++));
			enc4 = base64_key_str.indexOf(input.charAt(i++));
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
			output = output + String.fromCharCode(chr1);
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
			chr1 = chr2 = chr3 = "";
			enc1 = enc2 = enc3 = enc4 = "";
		} while (i < input.length);
		return unescape(output);
	}
})();
