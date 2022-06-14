import { invariant } from 'outvariant'
import { ReadableStream, ReadableStreamState } from './ReadableStream'
import { ReadRequest } from './ReadRequest'

async function noOpAlgorithm(): Promise<void> {
  return
}

export interface ReadableStreamControllerOptions<Data> {
  stream: ReadableStream<unknown>
  highWaterMark: number
  startAlgorithm(controller: ReadableStreamController<Data>): Promise<void>
  pullAlgorithm: any
  cancelAlgorithm: any
  sizeAlgorithm: any
}

export interface ReadableStreamControllerState {
  started: boolean
  pulling: boolean
  pullAgain: boolean
  closeRequested: boolean
}

export interface ReadableStreamControllerQueuedChunk<Data> {
  value: Data
  size: number
}

export class ReadableStreamController<Data> {
  private state: ReadableStreamControllerState

  private stream: ReadableStream<unknown>
  private startAlgorithm?: ReadableStreamControllerOptions<Data>['startAlgorithm']
  private pullAlgorithm?: () => Promise<unknown>
  private cancelAlgorithm?: (reason?: string) => Promise<unknown>
  private sizeAlgorithm: any

  private queue: Array<ReadableStreamControllerQueuedChunk<Data>>
  private queueTotalSize: number
  private pendingPullIntos: any[]

  constructor(options: ReadableStreamControllerOptions<Data>) {
    this.stream = options.stream
    this.state = {
      started: false,
      pulling: false,
      pullAgain: false,
      closeRequested: false,
    }

    this.startAlgorithm = options.startAlgorithm
    this.pullAlgorithm = options.pullAlgorithm || noOpAlgorithm
    this.cancelAlgorithm = options.cancelAlgorithm || noOpAlgorithm
    this.sizeAlgorithm = options.sizeAlgorithm

    this.queue = []
    this.queueTotalSize = 0
    this.pendingPullIntos = []

    /**
     * @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1970-L1978
     */
    this.startAlgorithm?.(this)
      .then(() => {
        this.state.started = true
        this.pullIfNeeded()
      })
      .catch(this.triggerError)
  }

  /**
   * @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1924
   */
  public pull(readRequest: ReadRequest<Data>): void {
    if (this.queue?.length) {
      const chunk = this.dequeueChunk()

      if (this.state.closeRequested && !this.queue.length) {
        this.clearAlgorithms()
        this.close()
      } else {
        this.pullIfNeeded()
      }

      readRequest.chunk(chunk)
      return
    }

    const reader = this.stream['reader']
    invariant(reader, 'Reader not set')

    reader.readRequests.push(readRequest)

    this.pullIfNeeded()
  }

  private getReadRequestCount(): number {
    return this.stream['reader']?.readRequests.length ?? 0
  }

  private dequeueChunk() {
    const chunk = this.queue.shift()
    invariant(chunk, 'Failed to dequeue a chunk')

    this.queueTotalSize = Math.max(0, this.queueTotalSize - chunk.size)
    return chunk.value
  }

  /** @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1804 */
  public enqueue(chunk: Data): void {
    // If the stream is locked and is being read, then push the queued chunk
    // directly to the read request.
    if (this.stream.locked && this.getReadRequestCount()) {
      const readRequest = this.stream['reader']?.readRequests.shift()

      if (readRequest) {
        readRequest.chunk(chunk)
      }
    } else {
      try {
        const chunkSize = this.sizeAlgorithm(chunk)
        this.enqueueValueWithSize(chunk, chunkSize)
      } catch (error) {
        if (error instanceof Error) {
          this.triggerError(error)
        }
        throw error
      }
    }

    this.pullIfNeeded()
  }

  /** @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/util.js#L156 */
  private enqueueValueWithSize(chunk: Data, chunkSize: number): void {
    this.queue.push({
      value: chunk,
      size: chunkSize,
    })
    this.queueTotalSize += chunkSize
  }

  /**
   * @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1794
   */
  public close(): void {
    this.state.closeRequested = true

    if (!this.queue.length) {
      this.clearAlgorithms()
      this.stream.close()
    }
  }

  public async cancel(reason?: string): Promise<unknown> {
    this.clearQueue()

    try {
      const cancelResult = this.cancelAlgorithm?.(reason)
      return cancelResult
    } finally {
      this.clearAlgorithms()
    }
  }

  private canCloseOrEnqueue(): boolean {
    return (
      this.state.closeRequested &&
      this.stream['state'] === ReadableStreamState.Readable
    )
  }

  /**
   * @see https://github.com/nodejs/node/blob/561f7fe941929d6c10b82b8250c04afb0693e4f3/lib/internal/webstreams/readablestream.js#L1876
   */
  private pullIfNeeded(): void {
    if (!this.shouldCallPull()) {
      return
    }

    if (this.state.pulling) {
      this.state.pullAgain = true
      return
    }

    this.state.pulling = true

    this.pullAlgorithm?.()
      .then(() => {
        this.state.pulling = false

        if (this.state.pullAgain) {
          this.state.pullAgain = false
          this.pullIfNeeded()
        }
      })
      .catch((error) => this.triggerError(error))
  }

  private shouldCallPull(): boolean {
    if (!this.canCloseOrEnqueue() || !this.state.started) {
      return false
    }

    if (this.stream.locked && this.getReadRequestCount()) {
      return true
    }

    const desizedSize = 0
    invariant(
      desizedSize !== null,
      'Failed to check controller pull: desized size is null'
    )

    return desizedSize > 0
  }

  private triggerError(error: Error): void {
    this.clearQueue()
    this.clearAlgorithms()
    this.stream['triggerError'](error)
  }

  private clearQueue(): void {
    this.queue = []
    this.queueTotalSize = 0
  }

  private clearAlgorithms(): void {
    this.pullAlgorithm = undefined
    this.cancelAlgorithm = undefined
    this.sizeAlgorithm = undefined
  }
}
