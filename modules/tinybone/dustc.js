define([
        'module',
        'text',
        'dust'
    ],
function(module, text, dust) {
	var buildMap = {};

	return {
		load: function(name, req, onload, config) {
			var extension = name.substring(name.lastIndexOf('.'));
			var path = name.slice(0, -(extension.length));

			if (dust.cache && !dust.cache[path]) {
				text.get(req.toUrl(name), function(tpl) {
					try {
						if (config.isBuild) {
							// write out the module definition for builds
							buildMap[name] = ['define(["dust"],function(dust){dust.loadSource((function () { return ', dust.compile(tpl, path), '})()); return "', path, '";});'].join('');
						} else {
							dust.loadSource(dust.compile(tpl, path));
						}
						onload(path);
					} catch (e) {
						onload.error(e)
					}
				}, function (err) {
					if (err)
						onload.error(err)
				});
			} else {
				onload(path);
			}
		},
		write: function(plugin, name, write) {
			if (buildMap.hasOwnProperty(name)) {
				var fn = buildMap[name];
				write.asModule(plugin + '!' + name, fn);
			}
		}
	};
});
