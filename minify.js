#!/usr/local/bin/node

const FS = require('fs');
const PATH = require('path');
const BABEL = require("babel-core");


module.exports.minify = f => {
	console.log('minify',f);
	var JS = FS.readFileSync(f, 'utf-8')
	minJS = BABEL.transform(JS, {babelrc:false,comments:false,compact:false,minified:true,code:true,presets:['es2016'],plugins:["minify-mangle-names","minify-simplify","transform-remove-console"]}).code;
	var newPath = PATH.dirname(f)+'/dist/';
	var newName = PATH.basename(f).replace('.js','.min.js');
	try{FS.mkdirSync(newPath);} catch(e){}
	FS.writeFileSync(newPath+'/'+newName, minJS, 'utf-8');
	console.log('   ',JS.length,'>>',minJS.length);
	console.log('   ','saveTo: ',newPath+'/'+newName);
}

// var watchPath = process.argv[2];//'../';
// if(!watchPath) {console.error('no watchPath'); process.exit(1);}

// console.log(`\n\nwatching ${watchPath}\n\n`);
// FS.watch(watchPath, {
// 	recursive: true
// }, (event, filename) => {
// 	if (!filename.endsWith('.js')) return;
// 	if(PATH.dirname(filename).endsWith('/dist')) return;
// 	// if (filename.endsWith('.min.js')) process.exit(0);
// 	minify(watchPath+filename);
// });

