"use strict";

const findFile = require("find-file-in-dirs")
    , readFile = require("read-file-cache")
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
    }

    getTemplatePath (name, cb) {
        debugger
        findFile([
            `${this.bloggify.paths.root}/${this.bloggify.options.theme.path}`
          , `${this.bloggify.paths.bloggify}/${this.bloggify.options.theme.path}`
        ],`${name}.${this.bloggify.options.theme.ext}`, cb);
    }

    getTemplate (name, cb) {
        this.getTemplatePath(name, (err, path) => {
            if (err) { return cb(err); }
            readFile(path, cb);
        });
    }
};
