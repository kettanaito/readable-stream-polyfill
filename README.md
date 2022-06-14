# `ReadableStream`

A [WHATWG-compliant](https://streams.spec.whatwg.org/#readablestream) polyfill for `ReadableStream` based on the eponymous implementation in Node.js.

## Install

```sh
npm install readable-stream-polyfill
```

## Node.js API

```js
const { ReadableStream } = require('readable-stream-polyfill')

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
require('readable-stream-polyfill/globals')
```

## Usage

- [`ReadableStream` on MDN](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
