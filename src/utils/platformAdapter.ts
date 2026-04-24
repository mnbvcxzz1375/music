import { getPlatform, Platform } from '@/utils/platform'

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface FileResult {
  path: string
  content: string
}

export interface StorageAdapter {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
}

export interface PlatformAdapter {
  name: Platform
  
  openFile: (filters?: FileFilter[]) => Promise<FileResult | null>
  saveFile: (content: string, defaultPath?: string) => Promise<string | null>
  
  requestAudioPermission: () => Promise<boolean>
  createAudioContext: () => Promise<AudioContext>
  
  getStorage: () => StorageAdapter
  
  showNotification: (title: string, body: string) => Promise<void>
  
  getDeviceInfo: () => Promise<DeviceInfo>
}

export interface DeviceInfo {
  model: string
  platform: string
  osVersion: string
  appVersion: string
  isEmulator: boolean
}

class WebAdapter implements PlatformAdapter {
  name: Platform = 'web'
  
  async openFile(filters?: FileFilter[]): Promise<FileResult | null> {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = filters?.flatMap(f => f.extensions.map(e => `.${e}`)).join(',') || ''
    
    return new Promise((resolve) => {
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const content = await file.text()
          resolve({ path: file.name, content })
        } else {
          resolve(null)
        }
      }
      input.click()
    })
  }
  
  async saveFile(content: string, defaultPath?: string): Promise<string | null> {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultPath || 'file.xml'
    a.click()
    URL.revokeObjectURL(url)
    return a.download
  }
  
  async requestAudioPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' })
      if (result.state === 'granted') return true
      if (result.state === 'prompt') {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        return true
      }
      return false
    } catch {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        return true
      } catch {
        return false
      }
    }
  }
  
  async createAudioContext(): Promise<AudioContext> {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    return new AudioContextClass({ latencyHint: 'interactive' })
  }
  
  getStorage(): StorageAdapter {
    return {
      get: async (key: string) => localStorage.getItem(key),
      set: async (key: string, value: string) => localStorage.setItem(key, value),
      remove: async (key: string) => localStorage.removeItem(key),
      clear: async () => localStorage.clear(),
    }
  }
  
  async showNotification(title: string, body: string): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification(title, { body })
      }
    }
  }
  
  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      model: 'Web Browser',
      platform: 'web',
      osVersion: navigator.userAgent,
      appVersion: '1.0.0',
      isEmulator: false,
    }
  }
}

class TauriAdapter implements PlatformAdapter {
  name: Platform = 'tauri'
  
  async openFile(filters?: FileFilter[]): Promise<FileResult | null> {
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      const { readTextFile } = await import('@tauri-apps/api/fs')
      
      const selected = await open({
        multiple: false,
        filters: filters?.map(f => ({ name: f.name, extensions: f.extensions })),
      })
      
      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected)
        return { path: selected, content }
      }
      return null
    } catch {
      return new WebAdapter().openFile(filters)
    }
  }
  
  async saveFile(content: string, defaultPath?: string): Promise<string | null> {
    try {
      const { save } = await import('@tauri-apps/api/dialog')
      const { writeTextFile } = await import('@tauri-apps/api/fs')
      
      const path = await save({
        defaultPath,
        filters: [{ name: 'MusicXML', extensions: ['xml', 'musicxml'] }],
      })
      
      if (path) {
        await writeTextFile(path, content)
        return path
      }
      return null
    } catch {
      return new WebAdapter().saveFile(content, defaultPath)
    }
  }
  
  async requestAudioPermission(): Promise<boolean> {
    return true
  }
  
  async createAudioContext(): Promise<AudioContext> {
    return new WebAdapter().createAudioContext()
  }
  
  getStorage(): StorageAdapter {
    return new WebAdapter().getStorage()
  }
  
  async showNotification(title: string, body: string): Promise<void> {
    try {
      const { sendNotification } = await import('@tauri-apps/api/notification')
      await sendNotification({ title, body })
    } catch {
      await new WebAdapter().showNotification(title, body)
    }
  }
  
  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      const info = await invoke('get_device_info') as DeviceInfo
      return info
    } catch {
      return new WebAdapter().getDeviceInfo()
    }
  }
}

class CapacitorAdapter implements PlatformAdapter {
  name: Platform
  
  constructor(platform: 'ios' | 'android') {
    this.name = platform
  }
  
  async openFile(filters?: FileFilter[]): Promise<FileResult | null> {
    try {
      const { Camera, CameraResultType } = await import('@capacitor/camera')
      
      if (filters?.some(f => f.extensions.includes('png') || f.extensions.includes('jpg'))) {
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Base64,
          quality: 90,
        })
        return { path: 'camera_photo', content: photo.base64String || '' }
      }
      
      return new WebAdapter().openFile(filters)
    } catch {
      return new WebAdapter().openFile(filters)
    }
  }
  
  async saveFile(content: string, defaultPath?: string): Promise<string | null> {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      
      const result = await Filesystem.writeFile({
        path: defaultPath || 'file.xml',
        data: btoa(content),
        directory: Directory.Documents,
      })
      
      return result.uri
    } catch {
      return new WebAdapter().saveFile(content, defaultPath)
    }
  }
  
  async requestAudioPermission(): Promise<boolean> {
    try {
      const { Permissions } = await import('@capacitor/permissions')
      const result = await Permissions.query({ name: 'microphone' })
      
      if (result.state === 'granted') return true
      if (result.state === 'prompt' || result.state === 'denied') {
        const requestResult = await Permissions.request({ name: 'microphone' })
        return requestResult.state === 'granted'
      }
      return false
    } catch {
      return new WebAdapter().requestAudioPermission()
    }
  }
  
  async createAudioContext(): Promise<AudioContext> {
    return new WebAdapter().createAudioContext()
  }
  
  getStorage(): StorageAdapter {
    return {
      get: async (key: string) => {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const result = await Preferences.get({ key })
          return result.value
        } catch {
          return localStorage.getItem(key)
        }
      },
      set: async (key: string, value: string) => {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.set({ key, value })
        } catch {
          localStorage.setItem(key, value)
        }
      },
      remove: async (key: string) => {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.remove({ key })
        } catch {
          localStorage.removeItem(key)
        }
      },
      clear: async () => {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.clear()
        } catch {
          localStorage.clear()
        }
      },
    }
  }
  
  async showNotification(title: string, body: string): Promise<void> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
        }],
      })
    } catch {
      await new WebAdapter().showNotification(title, body)
    }
  }
  
  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      const { Device } = await import('@capacitor/device')
      const info = await Device.getInfo()
      return {
        model: info.model,
        platform: info.platform,
        osVersion: info.osVersion,
        appVersion: '1.0.0',
        isEmulator: info.isVirtual,
      }
    } catch {
      return new WebAdapter().getDeviceInfo()
    }
  }
}

let cachedAdapter: PlatformAdapter | null = null

export function getPlatformAdapter(): PlatformAdapter {
  if (!cachedAdapter) {
    const platform = getPlatform()
    
    if (platform.platform === 'tauri') {
      cachedAdapter = new TauriAdapter()
    } else if (platform.platform === 'ios') {
      cachedAdapter = new CapacitorAdapter('ios')
    } else if (platform.platform === 'android') {
      cachedAdapter = new CapacitorAdapter('android')
    } else {
      cachedAdapter = new WebAdapter()
    }
  }
  
  return cachedAdapter
}

export function resetPlatformAdapter(): void {
  cachedAdapter = null
}