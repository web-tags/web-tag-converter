#!/usr/local/bin/node

const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const HTMmin = require('html-minifier').minify;
const SASS = require('node-sass');
const LESS = require('less');
const BABEL = require("babel-core");


processTemplate = X => {
	return new Promise((resolve, reject) => {
		if(!X.src.template) resolve('');
		console.log("\tprocessTemplate",X.src.template.length);
		X.target.template = HTMmin(X.src.template, {
			removeComments: true,
			collapseWhitespace: true
			// removeAttributeQuotes: true
		});
		resolve(X);
    });
}

processStyle = X => {
	if (hasAttr(X.$('style'),'sass')) return sass(X);
	else return less(X);
}
sass = X => {
	return new Promise((resolve, reject) => {
		console.log("\tprocessSASS",X.src.style.length);
		X.target.style = SASS.renderSync({
			data: X.src.style,
			indentedSyntax: true,
			outputStyle: "compressed"
		}).css.toString();
		resolve(X);
	});
}
less = X => {
	return new Promise((resolve, reject) => {
		console.log("\tprocessLESS",X.src.style.length);
		LESS.render(X.src.style, {compress:true})
		    .then((output) => {
		    	// console.log(output.css);
		    	if(output.error) reject(output.error);
		    	X.target.style = output.css;
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


// return makeJS(script, tagname, template, $('script'));
// (script, tagname, template, tag)
processScript = X => {
	return new Promise((resolve, reject) => {
		console.log("\tprocessScript",X.src.script.length);
		var TPL = X.target.template ? `this.attachShadow({mode: 'open'}).appendChild(document.querySelector('template#${X.tagname}').content.cloneNode(true))` : '';
		var $ = hasAttr(X.$('script'),'$') ? `$(q){return this.shadowRoot.querySelector(q)}` : '';
		var $$ = hasAttr(X.$('script'),'$$') ? `$$(q){return this.shadowRoot.querySelectorAll(q)}` : '';
		var IDs = hasAttr(X.$('script'),'ids') ? `this.shadowRoot.querySelectorAll('[id]').forEach(node=>this[node.id]=node)` : '';
		var constructor = (TPL||IDs) ? `constructor() {super();${TPL};${IDs};}` : '';
		X.target.script = `
window.customElements.define('${X.tagname}', class extends HTMLElement {
	${constructor}
	${$}
	${$$}
 	${X.src.script}
});`;
		X.target.script = BABEL.transform(X.target.script, {babelrc:false,comments:false,compact:false,minified:true,code:true,presets:['es2016'],plugins:["minify-mangle-names","minify-simplify","transform-remove-console"]}).code;
		resolve(X);
	});
}



combineOutput = X => {
	return new Promise((resolve, reject) => {
		var css = X.target.style ? `<style>${X.target.style}</style>` : '';
		X.target.content = (X.target.style || X.target.template) ? `document.head.insertAdjacentHTML('beforeend', \`<template id="${X.tagname}">${css}${X.target.template}</template>\`);` : '';
		X.target.content += X.target.script;
		// out += OUT.more ? OUT.more : '';
		console.log("\tcombineOutput",X.target.content.length);
		resolve(X);
	});
}

hasAttr = (tag,attr) => tag.attr(attr) != undefined;

loadFile = filename => {
	return new Promise((resolve, reject) => {
		console.log('\nloadFile', filename);
		X = {src:{}, target:{}};
		X.src.filename = filename;
		X.tagname = filename.split('/').slice(-1)[0].replace('.tag.html', '');
		X.$ = cheerio.load(fs.readFileSync(filename, 'utf-8'));
		X.src.template = X.$('template').html();
		X.src.script = X.$('script').text();
		X.src.style = X.$('style').text();
		// X.src.links = [];
		// $('link').map( (i,x) => X.src.links.push( '' + $(x).attr('tag') ) );
		resolve(X);
	});
}

saveFile = X => {
	return new Promise((resolve, reject) => {
		var newPath = X.src.filename.split('/').slice(0,-1).join('/') + '/build/';
		X.target.filename = newPath+X.tagname+'.tag.js';
		console.log('\tsaveFile',X.target.filename,"\n\n\n");
		try{fs.mkdirSync(newPath);} catch(e){}
		fs.writeFileSync(X.target.filename, X.target.content, 'utf-8');
	});	
}

make = filename => {
	loadFile(filename)
	.then(X=>processTemplate(X))
	.then(X=>processStyle(X))
	.then(X=>processScript(X))
	.then(X=>combineOutput(X))
	.then(X=>saveFile(X))
	.catch(e=>console.error(e));
}


// make('weather/moon-phase.tag.html');

console.log('waiting for input...\n\n');
fs.watch(".", {
	recursive: true
}, (event, filename) => {
	if (!filename.includes('.tag.html')) return;
	make(filename);
});





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
