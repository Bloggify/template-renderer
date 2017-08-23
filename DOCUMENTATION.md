## Documentation

You can see below the API reference of this module.

### constructor

BloggifyTemplate
Creates a new instance of `BloggifyTemplate`.

#### Params
- **String** `name`: The name of the template.
- **String** `tmplPath`: The template path.

### constructor

BloggifyTemplateRenderer
Creates a new instance of `BloggifyTemplateRenderer`.

#### Params
- **Object** `bloggify`: The bloggify instance.

### `getTemplate(name, cb)`
Fetch a template by its name.

#### Params
- **String** `name`: The template name.
- **Function** `cb`: The callback function.

### `registerTemplate(name, tmplPath, usePathName, reregister)`
Use this method to register templates.

Usages:

```js
registerTemplate(name, path)
registerTemplate(path)
registerTemplate(index, path)
```

#### Params
- **String** `name`: The template name.
- **String** `tmplPath`: The template path.
- **Boolean** `usePathName`: Wether to use the pathname (in the template cache) or not.
- **Boolean** `reregister`: Wether to enforce the template reregistering.

#### Return
- **BloggifyTemplate** The template object.

### `getRenderer(ext)`
Gets the template renderer for that extension.

#### Params
- **String** `ext`: The renderer extension.

#### Return
- **Function** The renderer function.

### `registerRenderer(ext, func)`
Creates a new renderer.

#### Params
- **String** `ext`: The renderer extension.
- **Function** `func`: The renderer handler.

### `renderInternalServerError(ctx, data, err, cb)`
Renders the 500 server error and logs the error.

#### Params
- **Context** `ctx`: The context.
- **Object** `data`: The template data.
- **Error** `err`: The error to render.
- **Function** `cb`: The callback function.

### `beforeRender(url, method, cb, transType)`
Appends a hook that is executed before rendering the template.

#### Params
- **String** `url`: The render url.
- **String** `method`: The methods of the renderer.
- **Function** `cb`: The callback function.
- **Object** `transType`: The transform type.

#### Return
- **Hook** The new hook will be returned.

### `render(ctx, tmplName, data, cb)`
Renders a template for a given context.

#### Params
- **Context** `ctx`: The context.
- **String** `tmplName`: The template name.
- **Object** `data`: The template data.
- **Function** `cb`: The callback function.

