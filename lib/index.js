"use strict"

const readFile = require("read-file-cache")
    , readJson = require("safe-r-json")
    , path = require("path")
    , ul = require("ul")
    , forEach = require("iterate-object")
    , noop = require("noop6")
    , deffy = require("deffy")

class BloggifyTemplate {
    /**
     * BloggifyTemplate
     * Creates a new instance of `BloggifyTemplate`.
     *
     * @param  {String} name     The name of the template.
     * @param  {String} tmplPath The template path.
     */
    constructor (name, tmplPath) {
        this.name = name
        this.data = null
        if (typeof tmplPath === "function") {
            this.render = tmplPath
            this.hasRenderer = true
        } else {
            this.path = tmplPath.absolute
            this.ext = tmplPath.ext.slice(1)
            this.dir = tmplPath.dir
            this.base = tmplPath.base
            this.render = ctx => {
                ctx.end(`Please register the ${this.ext} render.`, 500)
            }
            this.hasRenderer = false
        }
    }
}

class BloggifyTemplateRenderer {

    /**
     * BloggifyTemplateRenderer
     * Creates a new instance of `BloggifyTemplateRenderer`.
     *
     * @param  {Object} bloggify The bloggify instance.
     */
    constructor (bloggify) {
        this.bloggify = bloggify

        // This is useful to do something before rendering
        this.renderHookName = "custom:render_data"

        // Templates
        this.templates = {}

        // Renderers
        this.renderers = {}
    }

    /**
     * getTemplate
     * Fetch a template by its name.
     *
     * @name getTemplate
     * @function
     * @param {String} name The template name.
     * @param {Function} cb The callback function.
     */
    getTemplate (name, cb) {
        let tmpl = this.templates[name]
        if (!tmpl && path.isAbsolute(name)) {
            tmpl = this.registerTemplate(name, null, true)
        }
        if (tmpl) {
            return cb(null, tmpl)
        }
        cb(new Error("Template not found: " + name))
    }


    /**
     * registerTemplate
     * Use this method to register templates.
     *
     * Usages:
     *
     * ```js
     * registerTemplate(name, path)
     * registerTemplate(path)
     * registerTemplate(index, path)
     * ```
     *
     * @name registerTemplate
     * @function
     * @param {String} name The template name.
     * @param {String} tmplPath The template path.
     * @param {Boolean} usePathName Wether to use the pathname (in the template cache) or not.
     * @param {Boolean} reregister Wether to enforce the template reregistering.
     * @return {BloggifyTemplate} The template object.
     */
    registerTemplate (name, tmplPath, usePathName, reregister) {

        if (arguments.length === 0 || (typeof name !== "string" && typeof tmplPath !== "string")) {
            throw new Error("Please provide the template path and name.")
        }

        if (!tmplPath) {
            tmplPath = name
            if (usePathName) {
                name = tmplPath
            } else {
                name = ""
            }
        }

        if (typeof name !== "string") {
            return this.registerTemplate("", tmplPath)
        }

        let parsedPath = ""
        if (typeof tmplPath === "string") {
            parsedPath = path.parse(tmplPath)
            name = name || parsedPath.name
            parsedPath.absolute = tmplPath
        }

        let existing = this.templates[name]
        if (existing && !reregister) {
            return existing
        }

        let tmpl = new BloggifyTemplate(name, parsedPath || tmplPath)
        let renderer = this.getRenderer(tmpl.ext)
        if (renderer) {
            tmpl.render = renderer
        }
        this.templates[tmpl.name] = tmpl
        return tmpl
    }

    /**
     * getRenderer
     * Gets the template renderer for that extension.
     *
     * @name getRenderer
     * @function
     * @param {String} ext The renderer extension.
     * @returns {Function} The renderer function.
     */
    getRenderer (ext) {
        return this.renderers[ext]
    }

    /**
     * registerRenderer
     * Creates a new renderer.
     *
     * @name registerRenderer
     * @function
     * @param {String} ext The renderer extension.
     * @param {Function} func The renderer handler.
     */
    registerRenderer (ext, func) {
        let existing = this.getRenderer(ext)
        if (existing) {
            this.bloggify.log(`"${ext}" has been already registered`, "warn")
        } else {
            this.renderers[ext] = func
        }
        forEach(this.templates, tmpl => {
            if (tmpl.ext === ext && !tmpl.hasRenderer) {
                tmpl.hasRenderer = true
                tmpl.render = func
            }
        })
    }

    /**
     * renderInternalServerError
     * Renders the 500 server error and logs the error.
     *
     * @name renderInternalServerError
     * @function
     * @param {Context} ctx The context.
     * @param {Object} data The template data.
     * @param {Error} err The error to render.
     * @param {Function} cb The callback function.
     */
    renderInternalServerError (ctx, data, err, cb) {
        data.error = err
        this.bloggify.log(err, "error")
        if (data.__render500 === false) {
            ctx.end("Something went really wrong.", 500)
            return cb(err)
        }
        err.statusCode = 500
        this.bloggify.log("Rendering 500.")
        this._render(ctx, "500", data, err => {
            if (err) {
                data.__render500 = false
                return this.renderInternalServerError(ctx, data, err, cb)
            }
            cb()
        })
    }

    /*!
     * _render
     * The render method called internally.
     *
     * @name _render
     * @function
     * @param {Context} ctx The context.
     * @param {String} tmplName The template name.
     * @param {Object} data The template data.
     * @param {Function} cb The callback function.
     */
    _render (ctx, tmplName, data, cb) {
        cb = cb || noop
        this.getTemplate(tmplName, (err, tmpl) => {
            if (err) {
                if (data.error && data.error.statusCode === 500) {
                    return cb(err)
                }
                return this.renderInternalServerError(ctx, data, err, cb)
            }

            if (tmpl.data) {
                data = ul.merge(data, tmpl.data)
            }

            tmpl.render(ctx, data, tmpl, err => {
                if (err) {
                    if (data.error && data.error.statusCode === 500) {
                        return cb(err)
                    }
                    return this.renderInternalServerError(ctx, data, err, cb)
                }
                cb()
            })
        })
    }

    /**
     * beforeRender
     * Appends a hook that is executed before rendering the template.
     *
     * @param  {String} url        The render url.
     * @param  {String} method     The methods of the renderer.
     * @param  {Function} cb       The callback function.
     * @param  {Object} transType  The transform type.
     * @return {Hook} The new hook will be returned.
     */
    beforeRender (url, method, cb, transType) {
        return this.bloggify.server.hook(this.renderHookName, url, method, cb, transType)
    }
}

/**
 * render
 * Renders a template for a given context.
 *
 * @name render
 * @function
 * @param {Context} ctx The context.
 * @param {String} tmplName The template name.
 * @param {Object} data The template data.
 * @param {Function} cb The callback function.
 */
if (Bloggify.options.server.transformers) {
    BloggifyTemplateRenderer.prototype.render = function (ctx, tmplName, data, cb) {
        let trans = this.bloggify.server.getHooks(this.renderHookName, ctx.path, ctx.method)
        if (trans) {
            trans.start(data, (err, data) => {
                if (err) {
                    data.error = err
                }
                this._render(ctx, tmplName, data, cb)
            })
        } else {
            this._render(ctx, tmplName, data, cb)
        }
    }
} else {
    BloggifyTemplateRenderer.prototype.render = BloggifyTemplateRenderer.prototype._render
}

module.exports = BloggifyTemplateRenderer

