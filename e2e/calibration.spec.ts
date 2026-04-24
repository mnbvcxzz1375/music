import { test, expect } from '@playwright/test'

test.describe('Calibration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.calibration-wizard', { timeout: 5000 })
  })

  test('should display welcome step', async ({ page }) => {
    const welcomeContent = page.locator('.calib-content')
    await expect(welcomeContent).toBeVisible()
    
    const welcomeText = page.locator('.calib-text')
    await expect(welcomeText).toContainText('Welcome')
  })

  test('should navigate to instrument selection', async ({ page }) => {
    const startButton = page.locator('.calib-btn-action', { hasText: 'Start' })
    await expect(startButton).toBeVisible()
    await startButton.click()
    
    await page.waitForTimeout(500)
    
    const instrumentGrid = page.locator('.calib-grid')
    await expect(instrumentGrid).toBeVisible()
  })

  test('should select instrument and proceed', async ({ page }) => {
    const startButton = page.locator('.calib-btn-action', { hasText: 'Start' })
    await startButton.click()
    
    await page.waitForTimeout(500)
    
    const pianoButton = page.locator('.calib-btn-instrument', { hasText: 'Piano' })
    await pianoButton.click()
    
    await page.waitForTimeout(500)
    
    const nextButton = page.locator('.calib-btn-action', { hasText: 'Next' })
    await expect(nextButton).toBeVisible()
  })

  test('should complete calibration wizard steps', async ({ page }) => {
    const startButton = page.locator('.calib-btn-action', { hasText: 'Start' })
    await startButton.click()
    await page.waitForTimeout(300)
    
    const pianoButton = page.locator('.calib-btn-instrument', { hasText: 'Piano' })
    await pianoButton.click()
    await page.waitForTimeout(300)
    
    const nextButton = page.locator('.calib-btn-action', { hasText: 'Next' })
    if (await nextButton.isVisible()) {
      await nextButton.click()
      await page.waitForTimeout(300)
    }
    
    const skipButton = page.locator('.calib-btn-skip')
    if (await skipButton.isVisible()) {
      await skipButton.click()
      await page.waitForTimeout(300)
    }
    
    const finishButton = page.locator('.calib-btn-action', { hasText: 'Finish' })
    if (await finishButton.isVisible()) {
      await finishButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should have navigation buttons', async ({ page }) => {
    const actionButtons = page.locator('.calib-btn-action')
    const count = await actionButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe('Calibration Settings', () => {
  test('should persist calibration settings', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.calibration-wizard', { timeout: 5000 })
    
    const startButton = page.locator('.calib-btn-action', { hasText: 'Start' })
    await startButton.click()
    await page.waitForTimeout(300)
    
    const guitarButton = page.locator('.calib-btn-instrument', { hasText: 'Guitar' })
    await guitarButton.click()
    await page.waitForTimeout(300)
    
    const storage = await page.evaluate(() => {
      return localStorage.getItem('music-app-settings')
    })
    
    expect(storage).not.toBe(null)
  })
})