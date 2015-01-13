define(["routes", "lodash", "safe"], function(routes, _, safe) {
    getQueryStringKey = function(key) {
        return getQueryStringAsObject()[key];
    };


    getQueryStringAsObject = function() {
        var b, cv, e, k, ma, sk, v, r = {},
            d = function(v) {
                return decodeURIComponent(v).replace(/\+/g, " ");
            }, //# d(ecode) the v(alue)
            q = window.location.search.substring(1),
            s = /([^&;=]+)=?([^&;]*)/g //# original regex that does not allow for ; as a delimiter:   /([^&=]+)=?([^&]*)/g
        ;

        //# ma(make array) out of the v(alue)
        ma = function(v) {
            //# If the passed v(alue) hasn't been setup as an object
            if (typeof v != "object") {
                //# Grab the cv(current value) then setup the v(alue) as an object
                cv = v;
                v = {};
                v.length = 0;

                //# If there was a cv(current value), .push it into the new v(alue)'s array
                //#     NOTE: This may or may not be 100% logical to do... but it's better than loosing the original value
                if (cv) {
                    Array.prototype.push.call(v, cv);
                }
            }
            return v;
        };

        //# While we still have key-value e(ntries) from the q(uerystring) via the s(earch regex)...
        while (e = s.exec(q)) { //# while((e = s.exec(q)) !== null) {
            //# Collect the open b(racket) location (if any) then set the d(ecoded) v(alue) from the above split key-value e(ntry)
            b = e[1].indexOf("[");
            v = d(e[2]);

            //# As long as this is NOT a hash[]-style key-value e(ntry)
            if (b < 0) { //# b == "-1"
                //# d(ecode) the simple k(ey)
                k = d(e[1]);

                //# If the k(ey) already exists
                if (r[k]) {
                    //# ma(make array) out of the k(ey) then .push the v(alue) into the k(ey)'s array in the r(eturn value)
                    r[k] = ma(r[k]);
                    Array.prototype.push.call(r[k], v);
                }
                //# Else this is a new k(ey), so just add the k(ey)/v(alue) into the r(eturn value)
                else {
                    r[k] = v;
                }
            }
            //# Else we've got ourselves a hash[]-style key-value e(ntry)
            else {
                //# Collect the d(ecoded) k(ey) and the d(ecoded) sk(sub-key) based on the b(racket) locations
                k = d(e[1].slice(0, b));
                sk = d(e[1].slice(b + 1, e[1].indexOf("]", b)));

                //# ma(make array) out of the k(ey)
                r[k] = ma(r[k]);

                //# If we have a sk(sub-key), plug the v(alue) into it
                if (sk) {
                    r[k][sk] = v;
                }
                //# Else .push the v(alue) into the k(ey)'s array
                else {
                    Array.prototype.push.call(r[k], v);
                }
            }
        }

        //# Return the r(eturn value)
        return r;
    };

    /**
     * URL Router
     * @param {String} url, routing url.
     *  e.g.: /user/:id, /user/:id([0-9]+), /user/:id.:format?
     * @param {Boolean} [strict] strict mode, default is false.
     *  if use strict mode, '/admin' will not match '/admin/'.
     */
    function Router(url, strict) {
        this.keys = null;
        if (url instanceof RegExp) {
            this.rex = url;
            this.source = this.rex.source;
            return;
        }

        var keys = [];
        this.source = url;
        url = url.replace(/\//g, '\\/') // '/' => '\/'
            .replace(/\./g, '\\.?') // '.' => '\.?'
            .replace(/\*/g, '.+'); // '*' => '.+'

        // ':id' => ([^\/]+),
        // ':id?' => ([^\/]*),
        // ':id([0-9]+)' => ([0-9]+)+,
        // ':id([0-9]+)?' => ([0-9]+)*
        url = url.replace(/:(\w+)(?:\(([^\)]+)\))?(\?)?/g, function(all, name, rex, atLeastOne) {
            keys.push(name);
            if (!rex) {
                rex = '[^\\/]' + (atLeastOne === '?' ? '*' : '+');
            }
            return '(' + rex + ')';
        });
        // /user/:id => /user, /user/123
        url = url.replace(/\\\/\(\[\^\\\/\]\*\)/g, '(?:\\/(\\w*))?');
        this.keys = keys;
        var re = '^' + url;
        if (!strict) {
            re += '\\/?';
        }
        re += '$';
        this.rex = new RegExp(re);
    }

    /**
     * Try to match given pathname, if match, return the match `params`.
     *
     * @param {String} pathname
     * @return {Object|null} match `params` or null.
     */
    Router.prototype.match = function(pathname) {
        var m = this.rex.exec(pathname);
        // console.log(this.rex, pathname, this.keys, m, this.source)
        var match = null;
        if (m) {
            if (!this.keys) {
                return m.slice(1);
            }
            match = {};
            var keys = this.keys;
            for (var i = 0, l = keys.length; i < l; i++) {
                var value = m[i + 1];
                if (value) {
                    match[keys[i]] = value;
                }
            }
        }
        return match;
    };

    var paths = [];
    _.each(routes, function(v, k) {
        paths.push(new Router(k, false))
    })

    function resolveUrl( /* ...urls */ ) {
        var numUrls = arguments.length

        if (numUrls === 0) {
            throw new Error("resolveUrl requires at least one argument; got none.")
        }

        var base = document.createElement("base")
        base.href = arguments[0]

        if (numUrls === 1) {
            return base.href
        }

        var head = document.getElementsByTagName("head")[0]
        head.insertBefore(base, head.firstChild)

        var a = document.createElement("a")
        var resolved

        for (var index = 1; index < numUrls; index++) {
            a.href = arguments[index]
            resolved = a.href
            base.href = resolved
        }

        head.removeChild(base)

        return resolved
    }

    return function(ctx) {
        var router;
        window.onpopstate = function(event) {
            router.navigateTo(document.location, ctx.errHandler);
        };
        router = {
            navigateTo: function(href, next) {
				next || (next = ctx.errHandler);
                var url = resolveUrl(href);
                var prefix = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + ctx.prefix
                var uri = url.replace(prefix, "/");
                var match = null;
                _.each(paths, function(p) {
					if (match) return;
                    match = p.match(uri);
                    if (match) {
                        history.pushState({}, "", url);
                        var v = routes[p.source];
                        requirejs(['routes/' + v], function(route) {
                            route({
                                params: match,
                                query: getQueryStringAsObject()
                            }, {
                                render: function() {
                                    ctx.render.apply(ctx, arguments)
                                }
                            }, next)
                        }, next)
                    }
                })
                // if no match found just do normal
                // client navigation
                if (!match)
					window.location = url;
            }
        }
        return router;
    }

})
