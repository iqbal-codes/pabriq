// Browser stub for Node.js modules to prevent Rollup client-side build errors.
// These stubs are only loaded in the browser client where Node APIs are not executed.

// node:stream / node:stream/web
export class Readable {}
export class Writable {}
export class Transform {}
export class Duplex {}
export class PassThrough {}
export const pipeline = () => {}
export const finished = () => {}

export const ReadableStream =
  typeof globalThis !== 'undefined' ? globalThis.ReadableStream : class {}
export const WritableStream =
  typeof globalThis !== 'undefined' ? globalThis.WritableStream : class {}
export const TransformStream =
  typeof globalThis !== 'undefined' ? globalThis.TransformStream : class {}

// node:async_hooks
export class AsyncLocalStorage<T = unknown> {
  disable(): void {}
  getStore(): T | undefined {
    return undefined
  }
  run<R>(_store: T, callback: () => R, ..._args: unknown[]): R {
    return callback()
  }
}
