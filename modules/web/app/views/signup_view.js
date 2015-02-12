define(['tinybone/base', "tinybone/backadapter", 'dustc!templates/signup.dust'],function (tb, api) {
    var view = tb.View;
    var View = view.extend({
        id:"templates/signup",
        events: {
            "click .btn":function(e) {
                var self = this;
                var login = self.$('#login')[0].value;
                var pass = self.$('#pass')[0].value;
                var dang = self.$('.panel-danger');
                var textErr = self.$('.panel-body');
                api("users.signUp", "public", {login: login, pass: pass},  function(err, n) {
                    if (err)
                        throw err
                    else {
                        if (n != 0) {
                            $.cookie("token",login)
                            self.app.router.navigateTo('/web/')
                        }
                        else {
                            dang.css({display:'block'});
                            textErr.html('Login or password incorrect');
                        }
                    }
                });
            }
        }
    })
    View.id = "views/signup_view";
    return View;
})
