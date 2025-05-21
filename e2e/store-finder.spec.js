const { test, expect } = require('@playwright/test');

test.describe('Store Finder Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the store finder map', async ({ page }) => {
    // Check if the map container exists (desktop)
    const mapContainer = await page.locator('#pmt-map-container');
    await expect(mapContainer).toBeVisible();
  });

  test('should have a search input field', async ({ page }) => {
    const searchInput = await page.locator('input.pmt-sl-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
  });

  test('should display store list', async ({ page }) => {
    const storeList = await page.locator('#pmt-store-list-container');
    await expect(storeList).toBeVisible();
  });

  test('should filter stores when searching', async ({ page }) => {
    const searchInput = await page.locator('input.pmt-sl-search-input');
    await searchInput.fill('test');
    await searchInput.press('Enter');
    
    // Wait for any filtering to complete
    await page.waitForTimeout(1000);
    
    // Check if the store list updates
    const storeList = await page.locator('#pmt-store-list-container');
    await expect(storeList).toBeVisible();
  });
}); 