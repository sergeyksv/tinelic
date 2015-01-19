define(['tinybone/base','safe','tinybone/backadapter'],function (tb,safe,api) {
	var view = tb.View;
	return view.extend({
		id:"project/errors",
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			this.on("updateRange",function(_dtstart,_dtend){
				api("collect.getErrorStats","public",{quant:10,filter:{_idp:this.data.project._id,_dtstart:_dtstart,_dtend:_dtend}}, safe.sure(this.app.errHandler, function (errors) {
					self.data.errors = errors;
					self.render(safe.sure(self.app.errHandler, function (text) {
						self.$el.html(text);
						self.bindDom(self.$el);
					}));
				}))
			},this);
		}
	})
})

