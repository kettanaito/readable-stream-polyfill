import { ReadableStreamController } from './ReadableStreamController'
import { ReadableStreamReader } from './ReadableStreamReader'

export interface ReadableStreamSource<Data> {
  start?(controller: ReadableStreamController<Data>): Promise<void>
  pull?(): Promise<void>
  cancel?(): any
}

export interface ReadableStreamStrategy<Data> {
  highWaterMark?: number
  size?: ReadableStreamStrategySize<Data>
}

export interface ReadableStreamStrategySize<Data> {
  (chunk: Data): number
}

export enum ReadableStreamState {
  Closed = 'Closed',
  Errored = 'Errored',
  Readable = 'Readable',
}

/**
 * Readable stream.
 */
export class ReadableStream<Data> {
  public locked: boolean

  private state: ReadableStreamState
  private controller: ReadableStreamController<Data>
  private reader?: ReadableStreamReader<Data>
  private storedError?: Error

  constructor(
    source?: ReadableStreamSource<Data>,
    strategy?: ReadableStreamStrategy<Data>
  ) {
    this.locked = false
    this.state = ReadableStreamState.Readable

    this.controller = new ReadableStreamController({
      stream: this,
      startAlgorithm: source?.start || (async () => void 0),
      pullAlgorithm: source?.pull,
      cancelAlgorithm: source?.cancel,
      sizeAlgorithm: strategy?.size,
      highWaterMark: strategy?.highWaterMark ?? 1,
    })
  }

  public async getReader(): Promise<ReadableStreamReader<Data>> {
    return new ReadableStreamReader(this)
  }

  public async cancel(reason?: string): Promise<void> {
    if (this.locked) {
      throw new Error('ReadableStream is locked')
    }

    /** @todo */
  }

  public pipeTo(): any {
    return
  }
  public pipeThrough(): any {
    return
  }
  public tee(): any {
    return
  }

  private error(error: Error): void {
    if (this.state === ReadableStreamState.Readable) {
      this.state = ReadableStreamState.Errored
      this.storedError = error

      /**
       * @todo Reject reader promise, if present.
       * @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1591
       */

      if (this.reader?.readRequests.length) {
        for (const readRequest of this.reader.readRequests) {
          readRequest.error(error)
        }
        this.reader.readRequests = []
      }
    }
  }

  /** @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1559 */
  public close(): void {
    if (this.reader?.readRequests.length) {
      for (const readRequest of this.reader.readRequests) {
        readRequest.close()
      }
      this.reader.readRequests = []
    }
  }
}
