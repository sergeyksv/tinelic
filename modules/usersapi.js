var _ = require("lodash");
var safe = require("safe");
var CustomError = require('tinyback').CustomError;

module.exports.deps = ['mongo','obac'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;

	ctx.api.obac.register(['user_new','user_edit','user_view','*'],'users',{permission:'getPermission'});

	/**
	* @typedef User
	* @type {Object}
	* @property {String} _id
	* @property {String} firstname
	* @property {String} lastname
	* @property {String} login
	* @property {String} pass
	* @property {('admin'|'user')} pass
	*/
	ctx.api.validate.register("user", {$set:{
		properties:{
		_id:{type:"mongoId"},
		firstname:{type:"string",required:true,"maxLength": 64},
		lastname:{type:"string",required:true,"maxLength": 64},
		role:{required:true, enum: [ "admin", "user"]},
		login:{type:"string",required:true,"maxLength": 32},
		pass:{type:"string",required:true,"maxLength": 32}
	}}});

	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.series({
			"users":function (cb) {
				db.collection("users",cb);
			}
		}, safe.sure(cb,function (usr) {
			cb(null, {

/**
* REST API to manage users
*
* @exports UsersApi
*/
api:{

/**
* @param {String} token Auth token
* @param {String} _id User id
* @param {String} action One of "user_new", "user_view", "user_edit"
* @return {Boolean} result Allow or disallow
*/
getPermission:function (t, p, cb) {
	this.getCurrentUser(t, safe.sure(cb, function (u) {
		// admin can do everything
		if (u.role == "admin")
			return cb(null, true);
		// owner can create new user
		if (u.role == "owner" && p.action == "user_new")
			return cb(null, true);
		// user can edit and view himself
		if (u._id == p._id && p.action == "user_view" || p.action == "user_edit")
			return cb(null, true);
		// for rest we don't care
		else
			cb(null, null);
	}));
},

/**
* @param {String} token Auth token
* @param {Object} filter Mongo Query against user object
* @return {User} User
*/
getUser: function (t,u,cb) {
	usr.users.findOne(u.filter, cb);
},

/**
* @param {String} token Auth token
* @param {Object} filter Mongo Query against user object
* @return {User[]}
*/
getUsers: function (t,u,cb) {
	this.getCurrentUser(t, safe.sure(cb, function(u) {
		if (u.role == "admin") {
			usr.users.find({}).sort({name: 1}).toArray(cb);
		}
		else {
			throw new CustomError('You are not admin',"Access forbidden");
		}
	}));
},

/**
* Get current user
* @param {String} token Auth token
* @return {User} result Currently authenticated user
*/
getCurrentUser: function (t,cb) {
	usr.users.findOne({'tokens.token' : t }, safe.sure(cb, function(user){
		if (!user)
			return cb(new CustomError('Current user is unknown',"Unauthorized"));
		cb(null, user);
	}));
},

/**
* Creates of updates user object depending
*   on existance of _id attribute
*
* @param {String} token Auth token
* @param {User} user User object
* @param {String} user._id Id of user or null for new
* @return {User}
*/
saveUser: function (t,u,cb) {
	u = prefixify(u);
	ctx.api.validate.check("user", u, safe.sure(cb, function (u) {
		if (u._id)
			usr.users.update({_id: u._id},u,cb);
		else
			usr.users.insert(u,safe.sure(cb, function (res) {
				cb(null, res[0]);
			}));
	}));
},

/**
* @param {String} token Auth token
* @param {String} _id User id
*/
removeUser: function(t,u,cb) {
	u = prefixify(u);
	usr.users.remove({_id: u._id}, cb);
},

/**
* @param {String} token Auth token
* @param {String} login Login name
* @param {String} pass Passworde
* @return {String} New auth token
*/
login:function(t,u,cb) {
	var dt = new Date();
	var range = 7 * 24 * 60 * 60 * 1000;
	var dtexp = new Date(Date.parse(Date()) + range);

	usr.users.findAndModify(
		{login: u.login, pass: u.pass},{},{
			$push: {tokens:{token: Math.random().toString(36).slice(-14),_dt: dt,_dtexp: dtexp}}
			},{new: true, fields: {tokens: 1}}, safe.sure(cb, function(t) {
				cb(null, t.tokens[t.tokens.length-1].token);
		})
	);
},

/**
* @param {String} token Auth token
*/
logout: function(t, u, cb) {
	usr.users.update({'tokens.token':u.token}, { $pull: {tokens: { token: u.token } } },{},cb);
}

}});
}));
}));
};
