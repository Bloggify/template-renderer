"use strict";

const readFile = require("read-file-cache")
    , readJson = require("safe-r-json")
    , path = require("path")
    , ul = require("ul")
    , forEach = require("iterate-object")
    , noop = require("noop6")
    , deffy = require("deffy")
    ;

class BloggifyTemplate {
    constructor (name, tmplPath) {
        this.name = name;
        this.path = tmplPath.absolute;
        this.ext = tmplPath.ext.slice(1);
        this.dir = tmplPath.dir;
        this.base = tmplPath.base;
        this.hasRenderer = false;
        this.render = (lien => {
            lien.end(`Please register the ${this.ext} render.`, 500);
        });

    }
}

module.exports = class BloggifyThemeRenderer {

    /**
     * BloggifyThemeRenderer
     * The default theme renderer for Bloggify.
     *
     * @name bloggifyThemeRenderer
     * @function
     * @param {Number} a Param descrpition.
     * @param {Number} b Param descrpition.
     * @return {Number} Return description.
     */
    constructor (bloggify) {
        this.bloggify = bloggify;
        this.themeRoot = `${this.bloggify.paths.root}/${this.bloggify.options.theme.path}`;
        this.config = ul.deepMerge(readJson(`${this.themeRoot}/package.json`), {
            bloggify: {
                templates: {}
            }
        });
        this.renderHookName = "custom:render_data";
        this.templates = {};
        this.renderers = {};
        bloggify.assets.add(this.config.bloggify, this.themeRoot);
        forEach(this.config.bloggify.templates, (val, name) => {
            this.registerTemplate(name, `${this.themeRoot}/${val}`);
        });
    }

    beforeRender(url, method, cb, transType) {

        if (typeof url === "function") {
            cb = url;
            method = "all";
            url = "*";
        }

        if (typeof method === "function") {
            cb = method;
            method = "all";
        }

        if (method === "all") {
            httpMethods.forEach(c => this.hook(where, url, c, cb, transType));
            return this;
        }

        return this;
    }

    getTemplate (name, cb) {
        let tmpl = this.templates[name];
        if (!tmpl && name.startsWith("/")) {
            tmpl = this.registerTemplate(name);
        }
        if (tmpl) {
            return cb(null, tmpl);
        }
        cb(new Error("Template not found: " + name));
    }

    // registerTemplate(name, path)
    // registerTemplate(path)
    // registerTemplate(index, path)
    registerTemplate (name, tmplPath) {

        if (arguments.length === 0 || (typeof name !== "string" && typeof tmplPath !== "string")) {
            throw new Error("Please provide the template path and name.");
        }

        if (!tmplPath) {
            tmplPath = name;
            name = "";
        }

        if (typeof name !== "string") {
            return this.registerTemplate("", tmplPath);
        }

        let parsedPath = path.parse(tmplPath);
        name = name || parsedPath.name;
        parsedPath.absolute = tmplPath;

        let existing = this.templates[name];
        if (existing) {
            return existing;
        }

        let tmpl = new BloggifyTemplate(name, parsedPath);
        let renderer = this.getRenderer(tmpl.ext);
        if (renderer) {
            tmpl.render = renderer;
        }
        this.templates[tmpl.name] = tmpl;
        return tmpl;
    }

    getRenderer (ext) {
        return this.renderers[ext];
    }

    registerRenderer (ext, func) {

        let existing = this.getRenderer(ext);
        if (existing) {
            this.bloggify.log(`"${ext}" has been already registered`, "warn");
        } else {
            this.renderers[ext] = func;
        }
        forEach(this.templates, tmpl => {
            if (tmpl.ext === ext && !tmpl.hasRenderer) {
                tmpl.hasRenderer = true;
                tmpl.render = func;
            }
        });
    }

    renderInternalServerError (lien, data, err, cb) {
        data.error = err;
        this.bloggify.log(err);
        if (data.__render500 === false) {
            lien.end("Something went really wrong.", 500);
            return cb(err);
        }
        err.statusCode = 500;
        this.bloggify.log("Rendering 500.");
        this._render(lien, "500", data, err => {
            if (err) {
                data.__render500 = false;
                return this.renderInternalServerError(lien, data, err, cb);
            }
            cb();
        });
    }

    _render (lien, tmplName, data, cb) {
        cb = cb || noop;
        this.getTemplate(tmplName, (err, tmpl) => {
            if (err) {
                if (data.error && data.error.statusCode === 500) {
                    return cb(err);
                }
                return this.renderInternalServerError(lien, data, err, cb);
            }
            tmpl.render(lien, tmpl, data, err => {
                if (err) {
                    if (data.error && data.error.statusCode === 500) {
                        return cb(err);
                    }
                    return this.renderInternalServerError(lien, data, err, cb);
                }
                cb();
            });
        });
    }

    beforeRender (url, method, cb, transType) {
        return this.bloggify.server.hook(this.renderHookName, url, method, cb, transType);
    }

    render (lien, tmplName, data, cb) {
        let trans = this.bloggify.server.getHooks(this.renderHookName, lien.path, lien.method);
        if (trans) {
            trans.start(data, (err, data) => {
                if (err) {
                    data.error = err;
                }
                this._render(lien, tmplName, data, cb);
            });
        } else {
            this._render(lien, tmplName, data, cb);
        }
    }
};
