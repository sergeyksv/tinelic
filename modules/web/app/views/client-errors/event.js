define(['tinybone/base',"lodash",'tinybone/backadapter','safe','dustc!views/client-errors/event.dust'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/client-errors/event",
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
					data.push("<b>"+trace._s_context + "</b><br>");
					_.forEach(trace.post_context, function(r) {
						data.push(r + "<br>");
					});
					$li.append("<pre>"+data+"</pre>");
				}
				return false;
			}
		}
	});
	View.id = "views/client-errors/event";
	return View;
});
