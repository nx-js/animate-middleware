# The animate middleware

The `animate` middleware allows you to create entering, leaving and moving animations with a few custom attributes.

- name: animate
- direct middleware dependencies: [attributes](https://github.com/nx-js/attributes-middleware)
- all middleware dependencies: [observe](https://github.com/nx-js/observe-middleware), [attributes](https://github.com/nx-js/attributes-middleware)
- type: component or content middleware
- ignores: text nodes
- [docs](http://nx-framework.com/docs/middlewares/animate)

## Installation

`npm install @nx-js/animate-middleware`

## Usage

```js
const component = require('@nx-js/core')
const observe = require('@nx-js/observe-middleware')
const attributes = require('@nx-js/attributes-middleware')
const animate = require('@nx-js/animate-middleware')

component()
  .useOnContent(observe)
  .useOnContent(attributes)
  .useOnContent(animate)
  .register('animated-comp')
```

```html
<animated-comp @if="show">
  <span enter-animation="fadeIn 1s">Hello World!</span>
</animated-comp>
```
