if (typeof globalThis.ReadableStream === 'undefined') {
  const { ReadableStream } = require('./ReadableStream')
  globalThis.ReadableStream = ReadableStream
}
