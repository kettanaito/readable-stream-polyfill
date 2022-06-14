import { ReadableStream } from '../src/ReadableStream'

it('enqueues and reads multiple strnig chunks', async () => {
  const stream = new ReadableStream<string>({
    async start(controller) {
      controller.enqueue('hello')
      controller.enqueue('world')
      controller.close()
    },
  })

  const chunks = []
  const reader = await stream.getReader()

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    chunks.push(value)
  }

  expect(chunks).toEqual(['hello', 'world'])
})
