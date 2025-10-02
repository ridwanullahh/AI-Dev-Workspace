import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display welcome screen', async ({ page }) => {
    await expect(page.getByText('Welcome to AI Dev Workspace')).toBeVisible();
    await expect(page.getByText('Your intelligent, mobile-first development environment')).toBeVisible();
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    // Welcome screen
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
    await page.getByRole('button', { name: 'Get Started' }).click();

    // Security setup
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await expect(page.getByText('Secure Your Workspace')).toBeVisible();
    
    await page.getByPlaceholder('Enter a strong password').fill('testpassword123');
    await page.getByRole('button', { name: 'Secure My Workspace' }).click();

    // GitHub connection
    await expect(page.getByText('Step 3 of 5')).toBeVisible();
    await expect(page.getByText('Connect GitHub')).toBeVisible();
  });

  test('should allow skipping optional steps', async ({ page }) => {
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();

    await expect(page.getByText('Step 3 of 5')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.getByRole('button', { name: 'Get Started' }).click();
    
    await page.getByPlaceholder('Enter a strong password').fill('short');
    const secureButton = page.getByRole('button', { name: 'Secure My Workspace' });
    
    await expect(secureButton).toBeDisabled();
  });

  test('should complete onboarding flow', async ({ page }) => {
    // Navigate through all steps
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();

    // Final step
    await expect(page.getByText('All Set!')).toBeVisible();
    await page.getByRole('button', { name: 'Start Building' }).click();

    // Should navigate to main app
    await expect(page).toHaveURL('/');
  });
});
