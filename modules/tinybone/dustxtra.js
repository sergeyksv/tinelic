define(["dust","safe"], function (dust,safe) {
	// Make sure dust.helpers is an object before adding a new helper.
	if (!dust.helpers)
		dust.helpers = {};

	dust.helpers.view = function(chunk, context, bodies, params) {
		return chunk.map(function(chunk) {
			requirejs(['views/'+params.name], function (View) {
				var view = new View(context.get('_t_app'));
				var parent = context.get('_t_view');
				// need to overwrite getting base context
				// to current one, because it is subview
				view.getBaseTplCtx = function (cb) {
					safe.back(cb, null, context);
				}
				view.render(function (err,text) {
					chunk.end(text);
				})
			})
		});
	};

	dust.config.whitespace = true;
})
