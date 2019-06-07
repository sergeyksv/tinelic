'use strict';
/* global define */

/**
 * locals.cnt
 * locals.per_page
 * locals.page
 * locals.req
*/

define(['tinybone/base', 'lodash', 'dustc!views/common/pagination.dust'], (tb, _) => {
	const getPagination = (page, pages, count) => {
		page = parseInt(page, 10) || 1;
		pages = parseInt(pages, 10) || 0;

		if (pages < 2)
			return false;

		let limit = 4,
			middle = 2,
			start = 1,
			end = pages,
			i,
			pg = { pages: [], count: count };

		if (page === 1)
			pg.first = 1;
		else
			pg.prev = page - 1;

		if (page === pages)
			pg.last = 1;
		else
			pg.next = page + 1;

		if (pages <= limit) {
			for (i = 1; i <= pages; i++) {
				pg.pages.push({ page: i, label: i, active: (i === page) });
			}

			return pg;
		}

		start = page - middle;
		end = page + middle;

		if (end - start < limit) {
			start = end - limit;
		}

		if (start < 1) {
			start = 1;
			end = start + limit;
		}

		if (end > pages) {
			end = pages;
			start = end - limit;
			if (start < 1)
				start = 1;
		}

		pg.pages.push({ page: 1, label: 1, active: (1 === page) });

		if (pages > limit && page > middle) {
			pg.pages.push({ page: start, label: '...', active: false, delimiter: 1 });
			start++;
		}

		for (i = start + 1; i < end; i++) {
			pg.pages.push({ page: i, label: i, active: (i === page) });
		}

		if (pages > limit && page < pages - middle) {
			if (i === pages) pg.pages.push({ page: i, label: i, active: (i === page) });
			else pg.pages.push({ page: pages, label: '...', active: false, delimiter: 1 });
		}

		if (_.size(pg.pages) != pages)
			pg.pages.push({ page: pages, label: pages, active: (pages === page) });

		if (pages > limit) {
			if (pg.pages[1].delimiter)
				pg.pages[2].xshid = 1;

			if (pg.pages[pg.pages.length - 2].delimiter)
				pg.pages[pg.pages.length - 3].xshid = 1;
		}

		return pg;
	};

	let r20 = /%20/g,
		rbracket = /\[\]$/;

	const param = (a, traditional) => {
		let prefix,
			s = [],
			add = (key, value) => {
				value = _.isFunction(value) ? value() : (value == null ? '' : value);
				s[s.length] = encodeURIComponent(key) + '=' + encodeURIComponent(value);
			};
		// If an array was passed in, assume that it is an array of form elements.
		if (_.isArray(a)) {
			// Serialize the form elements
			_.each(a, (v, k) => add(k, v));

		} else {
			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for (prefix in a) {
				buildParams(prefix, a[prefix], traditional, add);
			}
		}

		// Return the resulting serialization
		return s.join('&').replace(r20, '+');
	};

	const buildParams = (prefix, obj, traditional, add) => {
		let name;

		if (_.isArray(obj)) {
			// Serialize array item.
			_.each(obj, (v, i) => {
				if (traditional || rbracket.test(prefix)) {
					// Treat each array item as a scalar.
					add(prefix, v);

				} else {
					// Item is non-scalar (array or object), encode its numeric index.
					buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add);
				}
			});

		} else if (!traditional && _.isPlainObject(obj)) {
			// Serialize object item.
			for (name in obj) {
				buildParams(prefix + '[' + name + ']', obj[name], traditional, add);
			}

		} else {
			// Serialize scalar item.
			add(prefix, obj);
		}
	};

	let view = tb.View;
	let View = view.extend({
		id: 'views/common/pagination',
		preRender: function () {
			this.data = {};
			let cnt = _.get(this.locals, 'cnt', 0);
			let pages = Math.ceil(cnt / _.get(this.locals, 'per_page', 10));
			if (pages > 1) {
				this.data.pagination = getPagination(_.get(this.locals, 'page', 1), pages, cnt);
				let queryString = param(_.omit(this.locals.req.query, 'page'));
				this.data.pagination.baseUrlWithQueryString = this.locals.req.baseUrl + this.locals.req.path + '?' + (queryString ? queryString + '&' : '');
			}
			view.prototype.preRender.call(this);
		},
		events: {
			'click .disabled a': function (e) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
	});
	View.id = 'views/common/pagination';
	return View;
});
