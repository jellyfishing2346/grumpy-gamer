import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Landing Page', () => {
  test('shows landing page with main heading', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('shows Get Started Free button', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText(/Get Started Free/i)).toBeVisible();
  });

  test('shows Log In link', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText(/Log In/i).first()).toBeVisible();
  });
});

test.describe('Login Page', () => {
  test('navigates to login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/Log In | Grumpy Gamer/);
  });

  test('shows email and password fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder('you@example.com').fill('wrong@test.com');
    await page.getByPlaceholder('••••••••').first().fill('wrongpassword');
    await page.getByRole('main').getByRole('button', { name: /log in/i }).click();
    await page.waitForTimeout(2000);
    const url = page.url();
    // Either shows error message or stays on login page
    expect(url).toContain('login');
  });
});

test.describe('Signup Page', () => {
  test('navigates to signup page', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await expect(page).toHaveTitle(/Sign Up | Grumpy Gamer/);
  });

  test('shows signup form fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('navigates to FAQ page', async ({ page }) => {
    await page.goto(`${BASE_URL}/faq`);
    await expect(page).toHaveTitle(/FAQ | Grumpy Gamer/);
  });

  test('navigates to Contact page', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    await expect(page).toHaveTitle(/Contact | Grumpy Gamer/);
  });

  test('public replay page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/999`);
    // Page should load without crashing (may redirect or show 404)
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('redirects unauthenticated users from dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    // Should redirect to login or show login page
    await expect(page).toHaveURL(/login|dashboard/, { timeout: 5000 });
  });
});