import { test, expect } from '@playwright/test';

test.describe('Document Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main editor layout', async ({ page }) => {
    // Check main layout components are visible
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
  });

  test('should show Document view by default', async ({ page }) => {
    // Document view should be active
    const documentButton = page.locator('button[title="Document"]');
    await expect(documentButton).toHaveClass(/text-\[#4fc3f7\]/);
  });

  test('should switch between view modes', async ({ page }) => {
    // Click on Research view
    await page.click('button[title="Research"]');
    await expect(page.locator('button[title="Research"]')).toHaveClass(/text-\[#4fc3f7\]/);
    
    // Click on Pen view
    await page.click('button[title="Pen"]');
    await expect(page.locator('button[title="Pen"]')).toHaveClass(/text-\[#4fc3f7\]/);
  });

  test('should toggle sidebar visibility', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('button[title="Toggle Sidebar"]');
    
    // Sidebar should be visible initially
    await expect(sidebar).toBeVisible();
    
    // Click toggle to hide
    await toggleButton.click();
    await expect(sidebar).not.toBeVisible();
    
    // Click toggle to show again
    await toggleButton.click();
    await expect(sidebar).toBeVisible();
  });

  test('should display formatting toolbar', async ({ page }) => {
    // Check formatting buttons are present
    await expect(page.locator('button[title="Emphasis"]')).toBeVisible();
    await expect(page.locator('button[title="Highlight"]')).toBeVisible();
    await expect(page.locator('button[title="Minimize Formatting"]')).toBeVisible();
    await expect(page.locator('button[title="Clear Formatting"]')).toBeVisible();
  });

  test('should handle tab creation and switching', async ({ page }) => {
    // Initially should have one tab
    const tabs = page.locator('[role="tablist"] button[role="tab"]');
    await expect(tabs).toHaveCount(1);
    
    // Add new tab
    await page.click('button[title="Add Tab"]');
    await expect(tabs).toHaveCount(2);
    
    // Switch between tabs
    await tabs.first().click();
    await expect(tabs.first()).toHaveAttribute('data-state', 'active');
  });
});