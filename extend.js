#!/usr/local/bin/node

const FS = require('fs');
const PATH = require('path');


module.exports.extend = f => {
	console.log('extend',f);
	var JS = FS.readFileSync(f, 'utf-8');
	var out = '';
	var lines = JS.split('\n');
	for(var i=0; i<lines.length; i++){
		if(lines[i].startsWith('//REQ:')){
			var req = lines[i].replace('//REQ:','').trim();
			console.log("REQ",req);
			out += FS.readFileSync(PATH.dirname(f)+'/'+req, 'utf-8');
		} else {
			out += lines[i];
		}
	}

	var newPath = PATH.dirname(f)
	if(!PATH.dirname(f).endsWith('/dist')) 
		newPath += '/dist/';
	try{FS.mkdirSync(newPath);} catch(e){}
	var newName = PATH.basename(f).replace('.js','.x.js');
	FS.writeFileSync(newPath+'/'+newName, out, 'utf-8');
	console.log('   ',JS.length,'>>',out.length);
	console.log('   ','saveTo: ',newPath+'/'+newName);

}