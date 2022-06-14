import {
  createDeferredPromise,
  DeferredPromise,
} from './utils/createDeferredPromise'

export interface ReadRequestPayload<Data> {
  value?: Data
  done: boolean
}

export class ReadRequest<Data> {
  private state: DeferredPromise<ReadRequestPayload<Data>>

  constructor() {
    this.state = createDeferredPromise()
  }

  get promise() {
    return this.state.promise
  }

  public chunk(value: Data) {
    this.state.resolve({
      value,
      done: false,
    })
  }

  public close() {
    this.state.resolve({
      value: undefined,
      done: true,
    })
  }

  public error(error: Error): void {
    this.state.reject(error)
  }
}
