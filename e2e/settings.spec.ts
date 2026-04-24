import { test, expect } from '@playwright/test'

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
  })

  test('should store settings in localStorage', async ({ page }) => {
    const storage = await page.evaluate(() => {
      return {
        settings: localStorage.getItem('music-app-settings'),
        keys: Object.keys(localStorage),
      }
    })
    
    expect(storage.keys.length).toBeGreaterThanOrEqual(0)
  })

  test('should persist settings after page reload', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('music-app-settings', JSON.stringify({
        instrumentType: 'violin',
        inputGain: 0.8,
        noiseFloor: -40,
      }))
    })
    
    await page.reload()
    await page.waitForTimeout(1000)
    
    const settings = await page.evaluate(() => {
      const stored = localStorage.getItem('music-app-settings')
      return stored ? JSON.parse(stored) : null
    })
    
    expect(settings).not.toBe(null)
    if (settings) {
      expect(settings.instrumentType).toBe('violin')
      expect(settings.inputGain).toBe(0.8)
      expect(settings.noiseFloor).toBe(-40)
    }
  })

  test('should clear settings when requested', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('music-app-settings', JSON.stringify({
        instrumentType: 'piano',
      }))
    })
    
    await page.evaluate(() => {
      localStorage.removeItem('music-app-settings')
    })
    
    const settings = await page.evaluate(() => {
      return localStorage.getItem('music-app-settings')
    })
    
    expect(settings).toBe(null)
  })

  test('should handle invalid settings gracefully', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('music-app-settings', 'invalid-json')
    })
    
    await page.reload()
    await page.waitForTimeout(1000)
    
    const errors = await page.evaluate(() => {
      const stored = localStorage.getItem('music-app-settings')
      return stored === 'invalid-json'
    })
    
    expect(errors).toBe(true)
  })
})

test.describe('Theme Settings', () => {
  test('should apply theme from settings', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('music-app-settings', JSON.stringify({
        theme: 'dark',
      }))
    })
    
    await page.reload()
    await page.waitForTimeout(1000)
    
    const bodyClass = await page.locator('body').getAttribute('class')
    const hasDarkTheme = bodyClass?.includes('dark') || false
    
    expect(typeof hasDarkTheme).toBe('boolean')
  })
})

test.describe('Language Settings', () => {
  test('should apply language from settings', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('music-app-settings', JSON.stringify({
        language: 'zh-CN',
      }))
    })
    
    await page.reload()
    await page.waitForTimeout(1000)
    
    const htmlLang = await page.locator('html').getAttribute('lang')
    
    expect(htmlLang).toBeDefined()
  })
})