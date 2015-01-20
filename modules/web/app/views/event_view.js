define(['tinybone/base',"lodash"],function (tb,_) {
	var view = tb.View;
	return view.extend({
		id:"event",
		populateTplCtx:function (ctx, cb) {
			// inject xtra data
			var selfId = this.data.event._id;
			var ids = this.data.info.ids;
			var idx = _.findIndex(ids, function (id) { return id==selfId; });
			var nextId = (idx<ids.length-1)?ids[idx+1]:null;
			var prevId = (idx>0)?ids[idx-1]:null;
			view.prototype.populateTplCtx.call(this,ctx.push({nextId:nextId, prevId:prevId}),cb);
		}
	})
})
