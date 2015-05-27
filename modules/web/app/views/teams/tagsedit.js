define(['tinybone/base','dustc!views/teams/tagsedit.dust'],function (tb) {
	var view = tb.View;
	var View = view.extend({
		id:"views/teams/tagsedit",
        postRender:function () {
            var $elt = this.$('input');

            var variants= new Bloodhound({
                local: this.data.variants,
                datumTokenizer: function(d) {
                    return Bloodhound.tokenizers.whitespace(d.text);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace
            });
            variants.initialize();

            $elt.tagsinput({
              itemValue: 'value',
              itemText: 'text',
              typeaheadjs: {
                  name: 'variants',
                  displayKey: 'text',
                  source: variants.ttAdapter()
              },
              freeInput:false
            });
            _.each(this.data.current, function (tag) {
                $elt.tagsinput('add', tag);
            });
        },
        events:{
            'click .doCancel': function(e) {
                this.trigger('cancel');
            },
            'click .doSave': function(e) {
                this.trigger('save',this.$('input').tagsinput('items')[0]);
            }
        }
	});
	View.id = "views/teams/tagsedit";
	return View;
});
