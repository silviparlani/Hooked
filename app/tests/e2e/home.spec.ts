import { expect, test } from '@playwright/test';

test('signed-out users see authentication without horizontal overflow', async ({ page }) => {
  await page.goto('/sign-in');

  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByLabel('Keep me logged in')).toBeChecked();

  const signInFieldFontSize = await page
    .getByLabel('Email')
    .evaluate((field) => window.getComputedStyle(field).fontSize);
  expect(Number.parseFloat(signInFieldFontSize)).toBeGreaterThanOrEqual(16);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
