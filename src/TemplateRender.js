const parsePath = require('parse-filepath');

const ejs = require( "ejs" );
const md = require('markdown-it')();
const Handlebars = require('handlebars');
const Mustache = require('mustache');
const haml = require('hamljs');
const pug = require('pug');
const nunjucks = require('nunjucks');
const liquidEngine = require('liquidjs')();

const cfg = require("../config.json");

// works with full path names or short engine name
function TemplateRender( path ) {
	this.parsed = path ? parsePath( path ) : undefined;
	this.engine = this.parsed && this.parsed.ext ? this.parsed.ext.substr(1) : path;
	this.defaultMarkdownEngine = cfg.markdownTemplateEngine || "liquid";
	this.defaultHtmlEngine = cfg.htmlTemplateEngine || "liquid";
}

TemplateRender.prototype.setDefaultMarkdownEngine = function(markdownEngine) {
	this.defaultMarkdownEngine = markdownEngine;
};

TemplateRender.prototype.setDefaultHtmlEngine = function(htmlEngine) {
	this.defaultHtmlEngine = htmlEngine;
};

TemplateRender.prototype.isEngine = function(engine) {
	return this.engine === engine;
};

TemplateRender.prototype.render = async function(str, data) {
	let fn = await this.getCompiledTemplatePromise(str);
	return fn(data);
};

TemplateRender.prototype.getCompiledTemplatePromise = async function(str, options) {
	options = Object.assign({
		parseMarkdownWith: this.defaultMarkdownEngine,
		parseHtmlWith: this.defaultHtmlEngine
	}, options);

	if( !this.engine || this.engine === "ejs" ) {
		return ejs.compile(str);
	} else if( this.engine === "md" ) {
		if( options.parseMarkdownWith ) {
			let fn = await ((new TemplateRender(options.parseMarkdownWith)).getCompiledTemplatePromise(str));

			return async function(data) {
				return md.render(await fn(data));
			};
		} else {
			return function(data) {
				// do nothing with data if parseMarkdownWith is falsy
				return md.render(str);
			};
		}
	} else if( this.engine === "html" ) {
		if( options.parseHtmlWith ) {
			let fn = await ((new TemplateRender(options.parseHtmlWith)).getCompiledTemplatePromise(str));

			return async function(data) {
				return await fn(data);
			};
		} else {
			return function(data) {
				// do nothing with data if parseHtmlWith is falsy
				return str;
			};
		}
	} else if( this.engine === "hbs" ) {
		return Handlebars.compile(str);
	} else if( this.engine === "mustache" ) {
		return function(data) {
			return Mustache.render(str, data).trim();
		};
	} else if( this.engine === "haml" ) {
		return haml.compile(str);
	} else if( this.engine === "pug" ) {
		return pug.compile(str);
	} else if( this.engine === "njk" ) {
		let tmpl = new nunjucks.Template(str);
		return function(data) {
			return tmpl.render(data);
		};
	} else if( this.engine === "liquid" ) {
		let tmpl = await liquidEngine.parse(str);
		return async function(data) {
			return await liquidEngine.render(tmpl, data);
		};
	} else {
		throw new Error(engine + " is not a supported template engine.");
	}
};

module.exports = TemplateRender;