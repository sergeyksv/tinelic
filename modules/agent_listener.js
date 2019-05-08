'use strict';
module.exports.deps = ['collect'];
module.exports.init = (ctx, cb) => {
	ctx.router.post('/invoke_raw_method', (req, res, next) => {
		ctx.api.collect.invoke(req, res, next);
	});
	cb(null, {api: null});
};
