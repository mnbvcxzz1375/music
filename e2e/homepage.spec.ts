import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/MusicMaster/)
  })

  test('should display app container', async ({ page }) => {
    const appContainer = page.locator('#root')
    await expect(appContainer).toBeVisible()
  })

  test('should show calibration wizard for first-time users', async ({ page }) => {
    const calibrationWizard = page.locator('.calibration-wizard')
    await expect(calibrationWizard).toBeVisible({ timeout: 5000 })
  })

  test('should have correct page structure', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('#root')).toBeVisible()
  })
})

test.describe('App Initialization', () => {
  test('should initialize without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    expect(errors).toHaveLength(0)
  })

  test('should load all required resources', async ({ page }) => {
    const failedRequests: string[] = []
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url())
    })
    
    await page.goto('/')
    await page.waitForTimeout(3000)
    
    expect(failedRequests.filter(url => url.includes('.js') || url.includes('.css'))).toHaveLength(0)
  })
})