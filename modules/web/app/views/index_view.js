define(['tinybone/base'],function (tb) {
	var view = tb.View;
	return view.extend({
		id:"index",
		events:{
			"click #etarget":"linkEvent"
		},
		linkEvent:function(e) {
			alert("Its alive")
		}
	})
})
