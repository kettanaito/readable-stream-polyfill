import { ReadableStream, ReadableStreamState } from './ReadableStream'
import { ReadRequest, ReadRequestPayload } from './ReadRequest'

export class ReadableStreamReader<Data> {
  public readRequests: ReadRequest<Data>[]

  constructor(private stream: ReadableStream<Data>) {
    this.readRequests = []
    return this
  }

  public async read(): Promise<ReadRequestPayload<Data>> {
    if (this.stream.locked) {
      throw new Error('ReadableStream is locked')
    }

    const readRequest = new ReadRequest<Data>()

    switch (this.stream['state']) {
      case ReadableStreamState.Closed: {
        readRequest.close()
        break
      }

      case ReadableStreamState.Errored: {
        readRequest.error(this.stream['storedError']!)
        break
      }

      case ReadableStreamState.Readable: {
        this.stream['controller'].pull(readRequest)
        break
      }
    }

    return readRequest.promise
  }

  /** @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1533 */
  public async cancel(reason?: string): Promise<unknown> {
    switch (this.stream['state']) {
      case ReadableStreamState.Closed: {
        return
      }

      case ReadableStreamState.Errored: {
        throw this.stream['storedError']!
      }
    }

    return this.stream['controller'].cancel(reason)
  }

  /** @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1718 */
  public releaseLock(): void {
    if (this.readRequests.length) {
      throw new Error('Cannot release with pending read requests')
    }

    if (this.stream['state'] === ReadableStreamState.Readable) {
      /** @todo */
    }
  }
}
