"use strict";

const findFile = require("find-file-in-dirs")
    , readFile = require("read-file-cache")
    , readJson = require("safe-r-json")
    , setOrGet = require("set-or-get")
    ;

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
        this.config = readJson(`${this.themeRoot}/package.json`, {});
        setOrGet(this.config, "bloggify", {});
        bloggify.assets.add(this.config.bloggify, this.themeRoot);
    }

    getTemplatePath (name, cb) {
        if (name.startsWith("/")) {
            return cb(null, name);
        }
        findFile([
            `${this.themeRoot}/${this.bloggify.options.theme.viewsPath}`
          , `${this.bloggify.paths.bloggify}/${this.bloggify.options.theme.path}/${this.bloggify.options.theme.viewsPath}`
        ],`${name}.${this.bloggify.options.theme.ext}`, cb);
    }

    getTemplate (name, cb) {
        this.getTemplatePath(name, (err, path) => {
            if (err) { return cb(err); }
            readFile(path, cb);
        });
    }
};
