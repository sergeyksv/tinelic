define([
        'module',
        'text',
        'dust.core',
        'dust.compile'
    ],
function(module, text, dust) {
	var buildMap = {};

	return {
		load: function(name, req, onload, config) {
			var extension = name.substring(name.lastIndexOf('.'));
			var path = name.slice(0, -(extension.length));
			text.get(req.toUrl(name), function(tpl) {
				try {
					if (config.isBuild) {
						// write out the module definition for builds
						buildMap[name] = ['define(["dust.core"],function(dust){dust.loadSource((function () { return ', dust.compile(tpl, path), '})()); return "', path, '";});'].join('');
					} else {
						dust.loadSource(dust.compile(tpl, path));
					}

					// trace view helper dependencies (sub views)
					var xtra = [],i,view,tpl1;
					var match = tpl.match(/@view\s+name=\"([^\"]+)\"/g);
					if (match) {
						for (i=0; i<match.length; i++) {
                            view = match[i];
							tpl1 = view.match(/@view\s+name=\"([^\"]+)\"/)[1];
							xtra.push(tpl1);
						}
					}
					req(xtra, function () {
						onload(path);
					},function (e) {
						onload.error(e);
					});
				} catch (e) {
					onload.error(e);
				}
			}, function (err) {
				if (err)
					onload.error(err);
			});
		},
		write: function(plugin, name, write) {
			if (buildMap.hasOwnProperty(name)) {
				var fn = buildMap[name];
				write.asModule(plugin + '!' + name, fn);
			}
		}
	};
});
