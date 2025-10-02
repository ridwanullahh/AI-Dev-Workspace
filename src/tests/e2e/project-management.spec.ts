import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assume onboarding is completed
  });

  test('should create a new project', async ({ page }) => {
    await page.getByRole('button', { name: 'Select Project' }).click();
    await page.getByRole('button', { name: '+ New Project' }).click();

    await page.getByLabel('Project Name').fill('Test Project');
    await page.getByLabel('Description').fill('E2E Test Project');
    await page.getByLabel('Type').selectOption('web');

    await page.getByRole('button', { name: 'Create Project' }).click();

    await expect(page.getByText('Test Project')).toBeVisible();
  });

  test('should search for projects', async ({ page }) => {
    await page.getByRole('button', { name: 'Select Project' }).click();
    
    const searchInput = page.getByPlaceholder('Search projects...');
    await searchInput.fill('Test');

    await expect(page.getByText('Test Project')).toBeVisible();
  });

  test('should switch between projects', async ({ page }) => {
    await page.getByRole('button', { name: 'Select Project' }).click();
    
    await page.getByText('Test Project').click();
    
    await expect(page.getByRole('button', { name: /Test Project/ })).toBeVisible();
  });

  test('should display project metadata', async ({ page }) => {
    await page.getByRole('button', { name: 'Select Project' }).click();
    await page.getByText('Test Project').click();

    await expect(page.getByText('web')).toBeVisible();
    await expect(page.getByText('E2E Test Project')).toBeVisible();
  });
});
