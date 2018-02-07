/**
 * Created by ivan on 5/14/15.
 */
define(['tinybone/base','bootstrap/modal', 'lodash','moment', 'dustc!views/modals/dtpick.dust','bootstrap/datetimepicker'],function (tb,modal,_,moment) {
    var view = tb.View;
    var View = view.extend({
        id:"views/modals/dtpick",
        postRender:function () {
            var str = $.cookie('str');
            var $from = self.$('#from');
            var $to = self.$('#to');
            self.$('.modal').modal('show');
            $from.datetimepicker();
            $to.datetimepicker();

            try {
                str = JSON.parse(str);
                $from.data('DateTimePicker').date(moment(str.from));
                $to.data('DateTimePicker').date(moment(str.to));
                $to.data("DateTimePicker").minDate(moment(str.from));
                $from.data("DateTimePicker").maxDate(moment(str.to));
            }
            catch (err) {
                $to.data('DateTimePicker').date(moment());
                $from.data("DateTimePicker").maxDate(moment());
            }

            $from.on("dp.change", function (e) {
                $to.data("DateTimePicker").minDate(e.date);
            });
            $to.on("dp.change", function (e) {
                $from.data("DateTimePicker").maxDate(e.date);
            });
        },
        events:{
            "click .do-save": function(e) {
                var self = this;
                var $from = Date.parse(self.$('#from').data("DateTimePicker").date());
                var $to = Date.parse(self.$('#to').data("DateTimePicker").date());

                if (isNaN($from) || isNaN($to))
                    return self.$('#warn').html('Please select folowing Date');

                self.trigger('saved',{from:$from,to:$to});

            },
            "click .do-close":function (e) {
                e.preventDefault();
                this.remove();
            }
        }
    });
    View.id = "views/modals/dtpick";
    return View;
});
