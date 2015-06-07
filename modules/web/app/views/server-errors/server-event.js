define(['tinybone/base',"lodash",'tinybone/backadapter','safe','dustc!views/server-errors/server-event.dust'],function (tb,_,api,safe) {
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
		id:"views/server-errors/server-event",
		events:{
			"click .do-get-trace": function (evt) {
				evt.preventDefault();
				$this = $(evt.currentTarget);
				$li = $this.closest("li");
				if ($li.find("pre").length) {
					$li.find("pre").remove();
				} else {
					var trace = this.data.event.stacktrace.frames[$this.data('idx')];
					var data = [];
					_.forEach(trace.pre_context, function(r) {
						data.push(r + "<br>");
					});
					data.push(trace._s_context + "<br>");
					_.forEach(trace.post_context, function(r) {
						data.push(r + "<br>");
					});
					$li.append("<pre>"+data+"</pre>");
				}
				return false;
			}
		}
	});
	View.id = "views/server-errors/server-event";
	return View;
});
