export interface DeferredPromise<Data> {
  promise: Promise<Data>
  resolve(value: Data): void
  reject(error: Error): void
}

export function createDeferredPromise<Data>(): DeferredPromise<Data> {
  let resolve: (value: Data) => void = () => {}
  let reject: (error: Error) => void = () => {}

  const promise = new Promise<Data>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}
