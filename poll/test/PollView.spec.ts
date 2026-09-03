import { test, expect } from '@playwright/test';
import admin from '@/core/tests/e2e-with-backend/admin';
import login from '@/core/tests/e2e-with-backend/login';
import { waitForApiResponse } from '@/core/tests/e2e-with-backend/waitForApiResponse';
import mockApiPoll from '@/core/tests/e2e-with-backend/pollMockApiFr';

test('view a Poll', async ({ page }) => {
    await admin({ page });
    await mockApiPoll(page);
    await page.goto('http://localhost:3000/polls/1');
    await waitForApiResponse(page, 'api/auth/polls/1?media=api&tenant=merciki&locale=fr_BE');
    await expect(page.getByText('Veux tu participer au')).toBeVisible();
    await expect(page.getByText('oui')).toBeVisible();
    await expect(page.getByText('non')).toBeVisible();
    await expect(page.getByText('peut être')).toBeVisible();
    await expect(page.getByText('5 (50.0 %)')).toBeVisible();
    await expect(page.getByText('2 (20.0 %)')).toBeVisible();
    await expect(page.getByText('3 (30.0 %)')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
});

test('Do not display polls unless you are an admin', async ({ page }) => {
    await login({ page });
    await mockApiPoll(page);
    await page.goto('http://localhost:3000/polls/1');
    await expect(page).toHaveURL('http://localhost:3000/feed');
});







