define(['tinybone/base',"lodash",'tinybone/backadapter','safe','dustc!templates/client-errors/event.dust'],function (tb,_,api,safe) {
	var view = tb.View;
	function htmlEscape(str) {
		return String(str)
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
	}
	var View = view.extend({
		id:"templates/client-errors/event",
		populateTplCtx:function (ctx, cb) {
			// inject xtra data
			if (this.data.event && this.data.event._id) {
				var selfId = this.data.event._id;
				var ids = this.data.info.ids;
				var idx = _.findIndex(ids, function (id) { return id==selfId; });
				var nextId = (idx<ids.length-1)?ids[idx+1]:null;
				var prevId = (idx>0)?ids[idx-1]:null;
			}
			view.prototype.populateTplCtx.call(this,ctx.push({nextId:nextId, prevId:prevId}),cb);
		},
		events:{
			"click .do-get-trace": function (evt) {
				evt.preventDefault();
				$this = $(evt.currentTarget);
				$li = $this.closest("li");
				if ($li.find("pre").length) {
					$li.find("pre").remove()
				} else {
					var trace = this.data.event.stacktrace.frames[$this.data('idx')];
					api("stats.getJSByTrace","public",trace, function (err,jsfile) {
						if (err) {
							$li.append("<pre>"+htmlEscape(err.message)+"</pre>");
						} else {
							$li.append("<pre>"+htmlEscape(jsfile)+"</pre>");
						}
					})
				}
				return false;
			}
		}
	})
	View.id = "views/client-errors/event_view";
	return View;
})
