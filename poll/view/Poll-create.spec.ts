import { test, expect } from '@playwright/test';
import admin from '@/core/tests/e2e-with-backend/admin';
import { waitForLoading } from '@/core/tests/e2e-with-backend/loader';

test.beforeEach(admin);

test('create a Poll', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(15000);
    await page.getByRole('link', { name: 'Nouveau sondage' }).click();
    await page.getByLabel('Option').click();
    await page.getByLabel('Option').fill('Veux tu participer au festival pokemon?');
    await page.locator('#basic_input').nth(1).click();
    await page.locator('#basic_input').nth(1).fill('oui');
    await page.locator('#basic_input').nth(2).click();
    await page.locator('#basic_input').nth(2).fill('non');
    await page.getByRole('button', { name: '+ Ajouter une option' }).click();
    await page.getByRole('button', { name: '+ Ajouter une option' }).click();
    await page.locator('#basic_input').nth(3).click();
    await page.locator('#basic_input').nth(3).fill('peut être');
    await expect(page.getByText('Option 4')).toBeVisible();
    await page.getByRole('button', { name: 'X' }).nth(4).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
});

test('create a Poll satisfaction', async ({ page }) => {
    await page.goto('http://localhost:3000/create/poll');
    await page.getByRole('button', { name: 'Choix unique' }).click();
    await page.getByText('Enquête de satisfaction').click();
    await expect(page.getByText('Sélectionnez la période du')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Sélectionnez la période du' })).toBeVisible();

    await page.getByRole('switch', { name: 'Sélectionnez la période du' }).click();

    await expect(page.getByRole('button', { name: 'Choix de la date' })).toBeVisible();

    await page.getByRole('switch', { name: 'Sélectionnez la période du' }).click();

    await page.getByRole('textbox', { name: 'Question du sondage' }).click();
    await page.getByRole('textbox', { name: 'Question du sondage' }).fill('Comment vas tu ?');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
});







