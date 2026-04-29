/**
 * Global test setup for vitest.
 * Loaded via vitest.config.ts setupFiles.
 *
 * Provides shared mocks for:
 * - fetch (API tests)
 * - URL.createObjectURL / URL.revokeObjectURL (blob handling)
 * - FileReader (file upload tests)
 */

import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  blob: vi.fn().mockResolvedValue(new Blob()),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  headers: new Headers(),
  url: '',
  redirected: false,
  statusText: 'OK',
  type: 'basic' as ResponseType,
  body: null,
  bodyUsed: false,
  clone: vi.fn(),
  bytes: vi.fn().mockResolvedValue(new Uint8Array(0)),
  formData: vi.fn().mockResolvedValue(new FormData()),
})

Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
  configurable: true,
})

// ---------------------------------------------------------------------------
// Mock URL.createObjectURL / URL.revokeObjectURL
// ---------------------------------------------------------------------------
const blobUrlMap = new Map<string, Blob>()
let blobUrlCounter = 0

const mockCreateObjectURL = vi.fn((blob: Blob | MediaSource): string => {
  blobUrlCounter += 1
  const url = `blob:mock/${blobUrlCounter}`
  if (blob instanceof Blob) {
    blobUrlMap.set(url, blob)
  }
  return url
})

const mockRevokeObjectURL = vi.fn((url: string): void => {
  blobUrlMap.delete(url)
})

Object.defineProperty(globalThis.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true,
  configurable: true,
})

// ---------------------------------------------------------------------------
// Mock FileReader
// ---------------------------------------------------------------------------
class MockFileReader {
  result: string | ArrayBuffer | null = null
  error: DOMException | null = null
  readyState: 0 | 1 | 2 = 0 // EMPTY=0, LOADING=1, DONE=2

  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null
  onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null
  onloadend: ((ev: ProgressEvent<FileReader>) => void) | null = null
  onloadstart: ((ev: ProgressEvent<FileReader>) => void) | null = null
  onprogress: ((ev: ProgressEvent<FileReader>) => void) | null = null
  onabort: ((ev: ProgressEvent<FileReader>) => void) | null = null

  abort = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  dispatchEvent = vi.fn().mockReturnValue(true)

  readAsDataURL(_file: Blob): void {
    this.readyState = 1
    this.result = 'data:application/octet-stream;base64,'
    this.readyState = 2
    // Trigger onload asynchronously to mimic real behavior
    queueMicrotask(() => {
      if (this.onload) {
        this.onload(new ProgressEvent('load') as ProgressEvent<FileReader>)
      }
      if (this.onloadend) {
        this.onloadend(new ProgressEvent('loadend') as ProgressEvent<FileReader>)
      }
    })
  }

  readAsText(_file: Blob, _encoding?: string): void {
    this.readyState = 1
    this.result = ''
    this.readyState = 2
    queueMicrotask(() => {
      if (this.onload) {
        this.onload(new ProgressEvent('load') as ProgressEvent<FileReader>)
      }
      if (this.onloadend) {
        this.onloadend(new ProgressEvent('loadend') as ProgressEvent<FileReader>)
      }
    })
  }

  readAsArrayBuffer(_file: Blob): void {
    this.readyState = 1
    this.result = new ArrayBuffer(0)
    this.readyState = 2
    queueMicrotask(() => {
      if (this.onload) {
        this.onload(new ProgressEvent('load') as ProgressEvent<FileReader>)
      }
      if (this.onloadend) {
        this.onloadend(new ProgressEvent('loadend') as ProgressEvent<FileReader>)
      }
    })
  }
}

Object.defineProperty(globalThis, 'FileReader', {
  value: MockFileReader,
  writable: true,
  configurable: true,
})

// ---------------------------------------------------------------------------
// Export mocks for tests that need direct access
// ---------------------------------------------------------------------------
export { mockFetch, mockCreateObjectURL, mockRevokeObjectURL, MockFileReader }
