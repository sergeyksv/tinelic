define(['tinybone/base', "tinybone/backadapter", 'dustc!views/signup/signup.dust'],function (tb, api) {
    var view = tb.View;
    var View = view.extend({
        id:"views/signup/signup",
        events: {
            "click #signup, submit form":function(e) {
                e.preventDefault();
                var self = this;
                var login = self.$('#login')[0].value;
                var pass = self.$('#pass')[0].value;
                var dang = self.$('.panel-danger');
                var textErr = self.$('.panel-body');
                api("users.login", "public", {login: login, pass: pass},  function(err, t) {
                    if (err) {
                        dang.css({display: 'block'});
                        textErr.html(err.toString());
                    }
                    else {
                       $.cookie("token", t, { expires: 7, path: "/" });
                       api.invalidate();
                       self.app.router.reload();
                    }
                });
            }
        }
    });
    View.id = "views/signup/signup";
    return View;
});
