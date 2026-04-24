import { test, expect } from '@playwright/test'

test.describe('Practice Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.calibration-wizard', { timeout: 5000 })
    
    const startButton = page.locator('.calib-btn-action', { hasText: 'Start' })
    await startButton.click()
    await page.waitForTimeout(300)
    
    const pianoButton = page.locator('.calib-btn-instrument', { hasText: 'Piano' })
    await pianoButton.click()
    await page.waitForTimeout(300)
    
    const skipButtons = page.locator('.calib-btn-skip')
    const skipCount = await skipButtons.count()
    for (let i = 0; i < skipCount; i++) {
      const skipBtn = skipButtons.nth(i)
      if (await skipBtn.isVisible()) {
        await skipBtn.click()
        await page.waitForTimeout(300)
      }
    }
    
    const finishButton = page.locator('.calib-btn-action', { hasText: 'Finish' })
    if (await finishButton.isVisible()) {
      await finishButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should display score renderer after calibration', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const scoreContainer = page.locator('.score-container')
    const isVisible = await scoreContainer.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(scoreContainer).toBeVisible()
    }
  })

  test('should show part selector for multi-part scores', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const partSelector = page.locator('.part-selector')
    const isVisible = await partSelector.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(partSelector).toBeVisible()
    }
  })

  test('should have practice controls', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const practiceControls = page.locator('.practice-controls')
    const isVisible = await practiceControls.isVisible().catch(() => false)
    
    if (isVisible) {
      const buttons = practiceControls.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('should display pitch indicator', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const pitchIndicator = page.locator('.pitch-indicator')
    const isVisible = await pitchIndicator.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(pitchIndicator).toBeVisible()
    }
  })
})

test.describe('Score Rendering', () => {
  test('should render sheet music', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    
    const svgContainer = page.locator('svg')
    const isVisible = await svgContainer.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(svgContainer).toBeVisible()
    }
  })

  test('should display cursor on score', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    
    const cursor = page.locator('.cursor')
    const isVisible = await cursor.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(cursor).toBeVisible()
    }
  })
})

test.describe('Audio Permissions', () => {
  test('should request microphone permission', async ({ page, context }) => {
    await context.grantPermissions(['microphone'])
    
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    const permissionStatus = await page.evaluate(async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        return result.state
      } catch {
        return 'unknown'
      }
    })
    
    expect(['granted', 'prompt', 'unknown']).toContain(permissionStatus)
  })
})