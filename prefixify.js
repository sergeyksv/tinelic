if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(["module","lodash"],function (module,_) {
	var translate = {
		"_i_": function (pr) {
			if (!isNaN(parseInt(pr)))
				return parseInt(pr);
		},
		"_s_": function (pr) {
			return pr.toString();
		},
		"_id": function (pr) {
			return pr.toString();
		},
		"_f_": function (pr) {
			if (!isNaN(parseFloat(pr)))
				return parseFloat(pr);
		},
		"_t_": function (pr) {
		},
		"_dt": function (pr) {
			var t = Date.parse(pr);
			if (!isNaN(t))
				return new Date(t);
			else if (!isNaN(parseInt(pr)))
				return new Date(parseInt(pr));
			else if (pr instanceof Date)
				return pr;
		},
		"_b_": function (pr) {
			if (_.contains([true,"true",1,"1"], pr))
				return 1;
			if (_.contains([false,"false",0,"0",null,"null",""], pr))
				return 0;
		}
	};

	function sortfix(obj) {
		var nobj = {};
		_.each(obj, function (v, k) {
			nobj[k] = parseInt(v);
		});
		return nobj;
	}

	function queryfix(obj, opts) {
		if (!obj) return null;
		var nobj = {};
		_.each(obj, function (v, k) {
			// query can use dot notation for names
			// last component should refer to actual type
			var prefix = k.match(/(_..).*$/);
			if (prefix)
				prefix = prefix[1];

			if (prefix && translate[prefix]) {
				// object meand op, like {$gt:5,$lt:8}
				if (_.isPlainObject(v)) {
					var no = {};
					_.each(v, function (val, op) {
						// op value is array {$in:[1,2,4]}
						if (_.isArray(val)) {
							var na = [];
							_.each(val, function (a) {
								try { na.push(translate[prefix](a)); } catch (e) {}
							});
							no[op]=na;
						} else {
							try { no[op] = translate[prefix](val); } catch (e) {}
						}
					});
					nobj[k]=no;
				} else {
					// plain value then
					try { nobj[k] = translate[prefix](v); } catch (e) {}
				}
			} else {
				if (_.isPlainObject(v))
					nobj[k]=queryfix(v,opts);
				else
					nobj[k]=v;
			}
		});
		return nobj;
	}

	function datafix(obj,opts) {
		var nobj = obj;
		_.each(obj, function (v, k) {
			if (_.isFunction(v))
				return;

			var prefix = null;
			if (k.length > 2 && k[0] == "_")
				prefix = k.substr(0,3);

			if (prefix && translate[prefix]) {
				var nv;
				try { nv = translate[prefix](v); } catch (e) {}
				if (_.isUndefined(nv)) {
					if (opts && opts.strict)
						throw new Error("Wrong field format: "+k);
					delete nobj[k];
				} else if (nv!==v)
					nobj[k] = nv;
			} else if (_.isObject(v) || _.isArray(v)) {
				datafix(v,opts);
			}
		});
		return nobj;
	}

	return {
		queryfix:queryfix,
		datafix:datafix,
		data:datafix,
		query:queryfix,
		sort:sortfix,
		register:function (prefix, transform) {
			translate[prefix]=transform;
		}
	};

});
