'use strict';
const _ = require('lodash'),
	safe = require('safe'),
	crypto = require('crypto'),
	{ CustomError } = require('tinyback');

module.exports.deps = ['mongo', 'obac'];

module.exports.init = function (ctx, cb) {
	var prefixify = ctx.api.prefixify.datafix;
	var queryfix = ctx.api.prefixify.queryfix;

	ctx.api.obac.register(['user_new', 'user_edit', 'user_view', '*'], 'users', { permission: 'getPermission' });

	ctx.api.obac.register(['user_edit', 'user_view'], 'users', { grantids: 'getGrantedUserIds' });

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
	ctx.api.validate.register('user', {
		$set: {
			properties: {
				_id: { type: 'mongoId' },
				firstname: { type: 'string', required: true, 'maxLength': 64 },
				lastname: { type: 'string', required: true, 'maxLength': 64 },
				role: { required: true, enum: ['admin', 'user'] },
				login: { type: 'string', required: true, 'maxLength': 32 },
				pass: { type: 'string', required: false, 'maxLength': 32 }
			}
		}
	});

	ctx.api.mongo.getDb({}, safe.sure(cb, function (db) {
		safe.series({
			'users': function (cb) {
				db.collection('users', safe.sure(cb, function (col) {
					safe.parallel([
						function (cb) { ctx.api.mongo.ensureIndex(col, { 'tokens.token': 1 }, cb); }
					], safe.sure(cb, col));
				}));
			},
			'teams': function (cb) {
				db.collection('teams', cb);
			}
		}, safe.sure(cb, function (usr) {

			ctx.locals.systoken = Math.random().toString(36).slice(-14);

			cb(null, {



				/**
				* REST API to manage users
				*
				* @exports UsersApi
				*/
				api: {

					/**
					* @param {String} token Auth token
					* @param {String} _id User id
					* @param {String} action One of "user_new", "user_view", "user_edit"
					* @return {Boolean} result Allow or disallow
					*/
					getPermission: function (t, p, cb) {
						this.getCurrentUser(t, {}, safe.sure(cb, function (u) {
							// admin can do everything
							if (u.role == 'admin')
								return cb(null, true);
							// owner can create new user
							if (u.role == 'owner' && p.action == 'user_new')
								return cb(null, true);
							// user can edit and view himself
							if (u._id == p._id && (p.action == 'user_view' || p.action == 'user_edit'))
								return cb(null, true);
							// for rest we don't care
							else
								cb(null, null);
						}));
					},

					/**
					* @param {String} token Auth token
					* @param {('user_view'|'user_edit')} action
					* @return {String[]} All granted project ids
					*/
					getGrantedUserIds: function (t, p, cb) {
						ctx.api.users.getCurrentUser(t, {}, safe.sure(cb, function (u) {
							var relmap = { user_edit: 'team_edit', user_view: 'team_view' };
							if (u.role != 'admin') {
								ctx.api.obac.getGrantedIds(t, { action: relmap[p.action] }, safe.sure(cb, function (teamids) {
									usr.teams.find(queryfix({ _id: { $in: teamids } })).toArray(safe.sure(cb, function (teams) {
										var userids = _.reduce(teams, function (res, v) {
											_.each(v.users, function (user) {
												res[user._idu] = 1;
											});
											return res;
										}, {});
										// we can see or edit ourselves
										userids[u._id] = 1;
										cb(null, _.keys(userids));
									}));
								}));
							} else {
								// admin can see all
								usr.users.find({}, { _id: 1 }).toArray(safe.sure(cb, function (projects) {
									cb(null, _.map(projects, '_id'));
								}));
							}
						}));
					},

					/**
					* @param {String} token Auth token
					* @param {Object} filter Mongo Query against user object
					* @return {User} User
					*/
					getUser: function (t, p, cb) {
						usr.users.findOne(prefixify(p.filter), { pass: 0, tokens: 0 }, safe.sure(cb, function (user) {
							if (!user)
								return cb(null, null);
							ctx.api.obac.getPermission(t, { _id: user._id, action: 'user_view', throw: 1 }, safe.sure(cb, user));
						}));
					},

					/**
					* @param {String} token Auth token
					* @param {Object} filter Mongo Query against user object
					* @return {User[]}
					*/
					getUsers: function (t, p, cb) {
						ctx.api.obac.getGrantedIds(t, { action: 'user_view' }, safe.sure(cb, function (ids) {
							var idsmap = {};
							_.each(ids, function (id) {
								idsmap[id] = 1;
							});
							var res = [];
							usr.users.find(queryfix(p.filter), { pass: 0, tokens: 0 }).toArray(safe.sure(cb, function (users) {
								_.each(users, function (p) {
									if (idsmap[p._id])
										res.push(p);
								});
								cb(null, res);
							}));
						}));
					},

					/**
					* Get current user
					* @param {String} token Auth token
					* @return {User} result Currently authenticated user
					*/
					getCurrentUser: function (t, p, cb) {
						if (t == ctx.locals.systoken)
							return safe.back(cb, null, { role: 'admin' });

						usr.users.findOne({ 'tokens.token': t }, safe.sure(cb, function (user) {
							if (!user)
								return cb(new CustomError('Current user is unknown', 'Unauthorized'));
							cb(null, user);
						}));
					},

					/**
					* Creates of updates user object depending
					* on existance of _id attribute
					*
					* @param {String} token Auth token
					* @param {User} user User object
					* @param {String} user._id Id of user or null for new
					* @return {User}
					*/
					saveUser: function (t, p, cb) {
						p = prefixify(p);
						if (p.pass && p.pass.length) {
							p.pass = crypto.createHash('md5').update(p.pass).digest('hex');
						}
						else {
							delete p.pass;
						}
						ctx.api.obac.getPermission(t, { action: p._id ? 'user_edit' : 'user_new', _id: p._id, throw: 1 }, safe.sure(cb, function () {
							ctx.api.validate.check('user', p, safe.sure(cb, function (u) {
								if (p._id)
									usr.users.update({ _id: p._id }, { $set: p }, cb);
								else
									usr.users.insert(p, safe.sure(cb, function () {
										cb(null, p);
									}));
							}));
						}));
					},

					saveFavorites: function (t, p, cb) {
						this.getCurrentUser(t, {}, safe.sure(cb, function (user) {
							p._id = user._id;
							p = prefixify(p);
							if (p._id) {
								if (p.update == '0')
									usr.users.update({ _id: p._id }, { $addToSet: { 'favorites': { _idf: p._idfavorite } } }, cb);
								else
									usr.users.update({ _id: p._id }, { $pull: { 'favorites': { _idf: p._idfavorite } } }, cb);
							} else {
								return cb(new CustomError('Current user is unknown', 'Unauthorized'));
							}
						}));
					},
					/**
					* @param {String} token Auth token
					* @param {String} _id User id
					*/
					removeUser: function (t, p, cb) {
						p = prefixify(p);
						ctx.api.obac.getPermission(t, { action: 'user_edit', _id: p._id, throw: 1 }, safe.sure(cb, function () {
							usr.users.remove({ _id: p._id }, safe.sure(cb, function () {
								usr.teams.update({ 'projects._idu': p._id }, { $pull: { users: { _idu: p._id } } }, { multi: true }, cb);
							}));
						}));
					},

					/**
					* @param {String} token Auth token
					* @param {String} login Login name
					* @param {String} pass Password
					* @return {String} New auth token
					*/
					login: function (t, p, cb) {
						var dt = new Date();
						var range = 7 * 24 * 60 * 60 * 1000;
						var dtexp = new Date(Date.parse(Date()) + range);
						var token = Math.random().toString(36).slice(-14);

						if (p.pass) {
							p.pass = crypto.createHash('md5').update(p.pass).digest('hex');
						}

						usr.users.findAndModify({ login: p.login, pass: p.pass }, {},
							{ $push: { tokens: { token: token, _dt: dt, _dtexp: dtexp } } },
							{ new: true, fields: { tokens: 1 } }, safe.sure(cb,
								function (t) {
									// remove expired tokens
									usr.users.update({ 'token._dtexp': { $lt: dt } }, { $pull: { 'token._dtexp': { $lt: dt } } }, safe.sure(cb, function () {
										if (t)
											cb(null, token);
										else
											cb(new CustomError('Log-in, password or both is not valid', 'Unauthorized'));
									}));
								})
						);
					},

					/**
					* @param {String} token Auth token
					*/
					logout: function (t, u, cb) {
						usr.users.update({ 'tokens.token': t }, { $pull: { tokens: { token: t } } }, {}, cb);
					}

				}
			});
		}));
	}));
};
