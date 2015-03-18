define(['tinybone/base',"lodash",'tinybone/backadapter','safe','dustc!templates/server-errors/server-event.dust'],function (tb,_,api,safe) {
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
		id:"templates/server-errors/server-event",
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
					var trace = this.data.event.stack_trace.frames[$this.data('idx')];
					var data = []
					_.forEach(trace.pre_context, function(r) {
						data.push(r + "<br>")
					})
					data.push(trace._s_context + "<br>")
					_.forEach(trace.post_context, function(r) {
						data.push(r + "<br>")
					})
					$li.append("<pre>"+data+"</pre>");
				}
				return false;
			}
		}
	})
	View.id = "views/server-errors/server-event_view";
	return View;
})
