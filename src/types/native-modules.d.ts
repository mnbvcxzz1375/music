declare module '@tauri-apps/api/dialog' {
  export interface OpenOptions {
    multiple?: boolean
    filters?: Array<{ name: string; extensions: string[] }>
  }
  export interface SaveOptions {
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }
  export function open(options?: OpenOptions): Promise<string | string[] | null>
  export function save(options?: SaveOptions): Promise<string | null>
}

declare module '@tauri-apps/api/fs' {
  export function readTextFile(path: string): Promise<string>
  export function writeTextFile(path: string, contents: string): Promise<void>
}

declare module '@tauri-apps/api/notification' {
  export interface NotificationOptions {
    title: string
    body?: string
  }
  export function sendNotification(options: NotificationOptions): Promise<void>
}

declare module '@tauri-apps/api/tauri' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
}

declare module '@capacitor/filesystem' {
  export enum Directory {
    Documents = 'DOCUMENTS'
  }
  export interface WriteFileResult {
    uri: string
  }
  export interface WriteFileOptions {
    path: string
    data: string
    directory: Directory
  }
  export const Filesystem: {
    writeFile(options: WriteFileOptions): Promise<WriteFileResult>
  }
}

declare module '@capacitor/camera' {
  export enum CameraResultType {
    Base64 = 'base64'
  }
  export interface Photo {
    base64String?: string
  }
  export interface GetPhotoOptions {
    resultType: CameraResultType
    quality?: number
  }
  export const Camera: {
    getPhoto(options: GetPhotoOptions): Promise<Photo>
  }
}

declare module '@capacitor/permissions' {
  export interface PermissionResult {
    state: 'granted' | 'denied' | 'prompt'
  }
  export interface QueryOptions {
    name: string
  }
  export interface RequestOptions {
    name: string
  }
  export const Permissions: {
    query(options: QueryOptions): Promise<PermissionResult>
    request(options: RequestOptions): Promise<PermissionResult>
  }
}

declare module '@capacitor/preferences' {
  export interface GetResult {
    value: string | null
  }
  export interface GetOptions {
    key: string
  }
  export interface SetOptions {
    key: string
    value: string
  }
  export interface RemoveOptions {
    key: string
  }
  export const Preferences: {
    get(options: GetOptions): Promise<GetResult>
    set(options: SetOptions): Promise<void>
    remove(options: RemoveOptions): Promise<void>
    clear(): Promise<void>
  }
}

declare module '@capacitor/local-notifications' {
  export interface ScheduleOptions {
    at: Date
  }
  export interface Notification {
    title: string
    body: string
    id: number
    schedule: ScheduleOptions
  }
  export interface ScheduleResult {
    notifications: Notification[]
  }
  export const LocalNotifications: {
    schedule(options: ScheduleResult): Promise<void>
  }
}

declare module '@capacitor/device' {
  export interface DeviceInfo {
    model: string
    platform: string
    osVersion: string
    isVirtual: boolean
  }
  export const Device: {
    getInfo(): Promise<DeviceInfo>
  }
}