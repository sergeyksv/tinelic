if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(["module","lodash"],function (module,_) {
    function encode(obj, copy) {
        var wrap = !(_.isPlainObject(obj) || _.isArray(obj));
        if (wrap)
            obj = [obj];

        var dst = copy?(_.isArray(obj)?[]:{}):obj;
        _.each(obj, function (v,k) {
            var nv;
            if (_.isDate(v))
                dst[k] = {$tson:'date',v:v.valueOf()};
            else if (_.isPlainObject(v) || _.isArray(v)) {
                nv = encode(v,copy);
                if (copy) dst[k] = nv;
            }
            else if (copy)
                dst[k]= v;
        });
        return wrap?dst[0]:dst;
    }

    function decode(obj,copy) {
        var wrap = !(_.isPlainObject(obj) || _.isArray(obj));
        if (wrap)
            obj = [obj];

        var dst = copy?(_.isArray(obj)?[]:{}):obj;
        _.each(obj, function (v,k) {
            var nv;
            if (_.isPlainObject(v)) {
                if (v.$tson && v.$tson=='date')
                    obj[k] = new Date(parseInt(v.v));
                else {
                    nv = decode(v,copy);
                    if (copy) dst[k] = nv;
                }
            } else if (_.isArray(v)) {
                nv = decode(v);
                if (copy) dst[k] = nv;
            } else if (copy)
                dst[k]= v;
        });
        return wrap?dst[0]:dst;
    }

    return {
        encode:encode,
        decode:decode
	};
});
