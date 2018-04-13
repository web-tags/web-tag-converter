#!/usr/local/bin/node

const FS = require('fs');
const PATH = require('path');
const WEBTAG = require('./webtag');
const MINIFY = require('./minify');
const EXTEND = require('./extend');

var watchPath = process.argv[2];//'../';
if(!watchPath) {console.error('no watchPath'); process.exit(1);}

console.log(`\n\nwatching ${watchPath}\n\n`);
FS.watch(watchPath, {
	recursive: true
}, (event, filename) => {

	if (filename.endsWith('.tag.html'))
		WEBTAG.create(watchPath+filename);

	if (filename.endsWith('.js'))
		if(!PATH.dirname(filename).endsWith('/dist'))
			MINIFY.minify(watchPath+filename);

	if (filename.endsWith('.tag.js'))
		EXTEND.extend(watchPath+filename);
});


