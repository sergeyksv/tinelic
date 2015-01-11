define(['views/layout','module','safe'],function (Layout,module,safe) {
	return {
		getLocalPath:function () {
			return module.uri.replace("app.js","");
		},
		getView:function () {
			return this.view || (this.view = new Layout(this));
		}
	}
})
