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

    /**
     * BloggifyTemplate
     * Creates a new instance of `BloggifyTemplate`.
     *
     * @param  {type} name     The name of the template.
     * @param  {type} tmplPath The path of the template.
     * @return {type}          The BloggifyTemplate instance.
     */
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

    /**
     * beforeRender - description
     *
     * @param  {type} url       description
     * @param  {type} method    description
     * @param  {Function} cb        The callback function.
     * @param  {type} transType description
     * @return {type}           description
     */
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

    /**
     * getTemplate - description
     *
     * @param  {type} name description
     * @param  {Function} cb   The callback function.
     * @return {type}      description
     */
    getTemplate (name, cb) {
        let tmpl = this.templates[name];
        if (!tmpl && path.isAbsolute(name)) {
            tmpl = this.registerTemplate(name, null, true);
        }
        if (tmpl) {
            return cb(null, tmpl);
        }
        cb(new Error("Template not found: " + name));
    }


    /**
     * registerTemplate - description
     *
     * @param  {type} name        description
     * @param  {type} tmplPath    description
     * @param  {type} usePathName description
     * @param  {type} reregister  description
     * @return {type}             description
     */
     // registerTemplate(name, path)
     // registerTemplate(path)
     // registerTemplate(index, path)
    registerTemplate (name, tmplPath, usePathName, reregister) {

        if (arguments.length === 0 || (typeof name !== "string" && typeof tmplPath !== "string")) {
            throw new Error("Please provide the template path and name.");
        }

        if (!tmplPath) {
            tmplPath = name;
            if (usePathName) {
                name = tmplPath;
            } else {
                name = "";
            }
        }

        if (typeof name !== "string") {
            return this.registerTemplate("", tmplPath);
        }

        let parsedPath = path.parse(tmplPath);
        name = name || parsedPath.name;
        parsedPath.absolute = tmplPath;

        let existing = this.templates[name];
        if (existing && !reregister) {
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

    /**
     * getRenderer - description
     *
     * @param  {type} ext description
     * @return {type}     description
     */
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

    /**
     * renderInternalServerError - description
     *
     * @param  {type} lien description
     * @param  {type} data description
     * @param  {type} err  description
     * @param  {Function} cb   The callback function
     * @return {type}      description
     */
    renderInternalServerError (lien, data, err, cb) {
        data.error = err;
        this.bloggify.log(err, "error");
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

    /**
     * beforeRender - description
     *
     * @param  {type} url       description
     * @param  {type} method    description
     * @param  {Function} cb        The callback function
     * @param  {type} transType description
     * @return {type}           description
     */
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
