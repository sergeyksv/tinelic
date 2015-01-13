define(['tinybone/view'],function (view) {
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
