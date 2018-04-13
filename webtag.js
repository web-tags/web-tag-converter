#!/usr/local/bin/node

const PATH = require('path');
const FS = require('fs');
const cheerio = require('cheerio');
const HTMmin = require('html-minifier').minify;
const SASS = require('node-sass');
const LESS = require('less');
const BABEL = require("babel-core");





processTemplate = X => {
	// console.log('X',JSON.stringify(X.src));
	return new Promise((resolve, reject) => {
		X.target.template = '';
		if(!X.src.template) resolve(X);
		console.log("\tprocessTemplate");
		X.target.template = HTMmin(X.src.template, {
			removeComments: true,
			collapseWhitespace: true
			// removeAttributeQuotes: true
		});
		console.log("\t   ",X.src.template.length,'>>',X.target.template.length);
		// console.log("----------");
		resolve(X);
    });
}

processStyle = X => {
	// console.log('X',JSON.stringify(X));
	// X.$.bbb = ()=>console.log('this',this);
	// X.$.bbb();
	// if (hasAttr(X.$('style'),'sass')) return sass(X);
	if (X.src.hasAttr('style','sass')) return sass(X);
	else return less(X);
}
sass = X => {
	return new Promise((resolve, reject) => {
		console.log("\tprocessSASS");
		X.target.style = SASS.renderSync({
			data: X.src.style,
			indentedSyntax: true,
			outputStyle: "compressed"
		}).css.toString();
		console.log("\t   ",X.src.style.length,'>>',X.target.style.length);
		resolve(X);
	});
}
less = X => {
	return new Promise((resolve, reject) => {
		console.log("\tprocessLESS");
		LESS.render(X.src.style, {compress:true})
		    .then((output) => {
		    	// console.log(output.css);
		    	if(output.error) reject(output.error);
		    	X.target.style = output.css;
				console.log("\t   ",X.src.style.length,'>>',X.target.style.length);
		    	resolve(X);
		        // output.css = string of css
		        // output.map = string of sourcemap
		        // output.imports = array of string filenames of the imports referenced
		    },
		    (error) => {
		    	reject(error);
		    });
	});
}


processScript = X => {
	return new Promise((resolve, reject) => {
		console.log("\tprocessScript");
		var TPL = X.target.template ? `this.attachShadow({mode: 'open'}).appendChild(document.querySelector('template#${X.tagname}').content.cloneNode(true))` : '';
		var $ = X.src.hasAttr('script','$') ? `$(q){return this.shadowRoot.querySelector(q)}` : '';
		var $$ = X.src.hasAttr('script','$$') ? `$$(q){return this.shadowRoot.querySelectorAll(q)}` : '';
		var IDs = X.src.hasAttr('script','ids') ? `this.shadowRoot.querySelectorAll('[id]').forEach(node=>this[node.id]=node)` : '';
		var constructor = (TPL||IDs) ? `constructor() {super();${TPL};${IDs};}` : '';
		X.target.script = `
window.customElements.define('${X.tagname}', class extends HTMLElement {
	${constructor}
	${$}
	${$$}
 	${X.src.script}
});`;
		if(!X.src.hasAttr('script','dev'))
			X.target.script = BABEL.transform(X.target.script, {babelrc:false,comments:false,compact:false,minified:true,code:true,presets:['es2016'],plugins:["minify-mangle-names","minify-simplify","transform-remove-console"]}).code;
		console.log("\t   ",X.src.script.length,'>>',X.target.script.length);
		resolve(X);
	});
}

processLinks = X => {
	return new Promise((resolve, reject) => {
		X.target.links = '';
		for(var i=0; i<X.src.links.length; i++)
			X.target.links += `//REQ:${X.src.links[i].replace('.tag.html','.tag.js')}\n`;
		// console.log('INKS',X.target.links);
		resolve(X);
	});
}

combineOutput = X => {
	return new Promise((resolve, reject) => {
		X.target.content = X.target.links;
		var css = X.target.style ? `<style>${X.target.style}</style>` : '';
		X.target.content += (X.target.style || X.target.template) ? `document.head.insertAdjacentHTML('beforeend', \`<template id="${X.tagname}">${css}${X.target.template}</template>\`);` : '';
		X.target.content += X.target.script;
		// out += OUT.more ? OUT.more : '';
		console.log("\tcombineOutput",X.target.content.length);
		resolve(X);
	});
}

// hasAttr = (tag,attr) => tag.attr(attr) != undefined;

loadFile = filename => {
	return new Promise((resolve, reject) => {
		console.log('\nloadFile', filename);
		X = {src:{}, target:{}};
		X.src.filename = filename;
		X.tagname = filename.split('/').slice(-1)[0].replace('.tag.html', '');
		X.$ = cheerio.load(FS.readFileSync(filename, 'utf-8'));
		// X.$.hasAttr = (attr) => this.attr(attr) != undefined;
		X.src.hasAttr = (tag,attr) => X.$(tag).attr(attr) != undefined;
		X.src.template = X.$('template').html();
		if(!X.src.template) X.src.template='';
		X.src.script = X.$('script').text();
		X.src.style = X.$('style').text();
		X.src.links = [];
		X.$('link').map( (i,x) => X.src.links.push( '' + X.$(x).attr('tag') ) );
		resolve(X);
	});
}

saveFile = X => {
	return new Promise((resolve, reject) => {
		// var newPath = X.src.filename.split('/').slice(0,-1).join('/') + '/build/';
		var newPath = PATH.dirname(X.src.filename)+'/dist/';
	// var newName = PATH.basename(f).replace('.js','.min.js');
		X.target.filename = newPath+X.tagname+'.tag.js';
		console.log('\tsaveFile',X.target.filename,"\n\n\n");
		try{FS.mkdirSync(newPath);} catch(e){}
		FS.writeFileSync(X.target.filename, X.target.content, 'utf-8');
	});	
}

module.exports.create = filename => {
	loadFile(filename)
	.then(X=>processTemplate(X))
	.then(X=>processStyle(X))
	.then(X=>processScript(X))
	.then(X=>processLinks(X))
	.then(X=>combineOutput(X))
	.then(X=>saveFile(X))
	.catch(e=>console.error(e));
}



// var watchPath = process.argv[2];//'../';
// if(!watchPath) {console.error('no watchPath'); process.exit(1);}

// console.log(`\n\nwatching ${watchPath}\n\n`);
// FS.watch(watchPath, {
// 	recursive: true
// }, (event, filename) => {
// 	if (!filename.includes('.tag.html')) return;
// 	make(watchPath+filename);
// });





















// return makeJS(script, tagname, template, $('script'));
// (script, tagname, template, tag)


// make('weather/moon-phase.tag.html');

// process.argv.forEach(function (val, index, array) {
//   console.log(index + ': ' + val);
// });



// addLinks = (links) => {
// 	// console.log('xxxx',links.length, typeof links);
// 	return new Promise((resolve, reject) => {
// 		return resolve('');
// 		var out = '';
// 		links.forEach(filename=>{
// 			// var filename = x;//$(x).attr('tag');
// 			// filename = filename.replace('.tag.html', 'build/tag.')

// 			console.log('filename',filename);
// 			// console.log('xxxx',links.length);

// 			// out += fs.readFileSync(filename, 'utf-8');
// 			// out += make(filename);
// 			console.log('new make');
// 			make(filename).then(output=>{
// 				return resolve(output);
// 				// console.log('NEW',output)
// 			});
// 		});
// 	});
// }


// .then(x=>{
// 		OUT.more = x;
// 		console.log("MORE",OUT.more);
// 		return combineOutput(OUT, tagname);
// 	})
			// return makeJS(script, tagname, template, $('script'));
		// OUT.JS = x;
		// return addLinks(links);
	// .then(X=>{
	// 	// OUT.TPL = x;
	// 	// if ($('style').attr('sass') != undefined) return sass(style);
	// }).then(X=>makeJS(X))


	// let tagname = filename.split('/').slice(-1)[0].replace('.tag.html', '');
	// console.log('make', filename, tagname);
	// let $ = cheerio.load(fs.readFileSync(filename, 'utf-8'));
	// let template = $('template').html();
	// let script = $('script').text();
	// let style = $('style').text();
	// let links = [];
	// $('link').map( (i,x) => links.push( '' + $(x).attr('tag') ) );
	// var OUT = {};


	// if (template) template = minHTM(template);
	// if ($('style').attr('sass') != undefined) style = sass(style);
	// console.log(style);
