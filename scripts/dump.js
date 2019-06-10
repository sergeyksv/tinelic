'use strict';
console.time('dump');
const { exec } = require('child_process');
const { config }  = require('../tools/index');

const {
	start,
	end,
	host,
	port,
	db,
	out,
	authenticationDatabase,
	username,
	password
} = config.dump;

/**
 * Convert a date into an ObjectId string
 * Accepts both Date object and string input
 * @param {string\|Date} timestamp
 */
const dateToId = timestamp => {
	/** Convert string date to Date object (otherwise assume timestamp is a date) */
	if (typeof (timestamp) == 'string')
		timestamp = new Date(timestamp);

	/** Convert date object to hex seconds since Unix epoch */
	const hexSeconds = Math.floor(timestamp / 1000).toString(16);

	return 'ObjectId("' + hexSeconds + '0000000000000000")';
};

const query = '{ "_id": { "$gt": ' + dateToId(start) + ', "$lte": ' + dateToId(end) + ' }}';

let collections = {
	action_errors: query,
	action_stats: query,
	actions: query,
	cache_collect_client_context: query,
	cache_web_wires: query,
	metrics: query,
	page_errors: query,
	page_reqs: query,
	pages: query,
	projects: null,
	teams: null,
	users: null
};

/**
 * exec mongodump for selected collection and query for her
 * @param {string} cmd
 */
const run = cmd => {
	exec(cmd, (err, stdout, stderr) => {
		if (err) {
			console.error(err);
			return;
		}

		console.log(`stdout: ${stdout}`);
		console.log(`stderr: ${stderr}`);
	});
};

let command = `mongodump --db ${db} --out ${out}`;

if (host) command += ` --host ${host}`;
if (port) command += ` --port ${port}`;

if (username && password && authenticationDatabase)
	command += ` --username ${username} --password ${password} --authenticationDatabase ${authenticationDatabase}`;

/** init */
for (let collection in collections) {
	let cmd = `${command} --collection ${collection}`;
	if (collections[collection]) cmd += ' --query \'' + collections[collection] + '\'';
	run(cmd);
}

process.on('exit', () => console.timeEnd('dump'));
