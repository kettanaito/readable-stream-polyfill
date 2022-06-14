# `ReadableStream`

A WHATWG-compliant polyfill for `ReadableStream` based on the eponymous implementation in Node.js.

## Install

```sh
npm install readablestream
```

## Node.js API

```js
const { ReadableStream } = require('readablestream')

const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('hello')
    controller.enqueue('world')
    controller.end()
  },
})

const reader = await stream.getReader()
```

## Polyfill

```js
// Polyfills the global "ReadableStream" class
// if it's not already implemented.
require('readablestream/polyfill')
```

## Usage

- [`ReadableStream` on MDN](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
