({
    appDir: "./modules/web/app",
    baseUrl: ".",
    dir: "./modules/web/public/js",
	findNestedDependencies: true,
	removeCombined: true,
	skipDirOptimize: false,
    modules:[
		{
			name:"app"
		},
		{
			name:"routes/main",
			exclude:[
				"app"
			]
		}
	],
	shim: {
		'dust': {
			exports: 'dust'
		}
	},
	paths:{
		"tinybone":"../../tinybone",
		"lodash":"../public/js/lodash",
		"dust":"../public/js/dust",
		"dustjs":"../public/js/dust",
		"dustc":"../../tinybone/dustc",
		"text":"../../../node_modules/requirejs-text/text",
		"safe":"../public/js/safe",
		"bootstrap":"../public/js/bootstrap",
		"moment":"../public/js/moment",
		"backctx":"empty:",
		"highcharts":"empty:"
	},
    map: {
        "dustc": {
            "dust": "dust"
        }
    }
})
