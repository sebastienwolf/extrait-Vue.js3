import { test, expect } from '@playwright/test';
import login from '../login';
import { waitForLoadingToSkeleton } from '../loader';

test('view feed', async ({ page }) => {
  await login({ page });
  await page.getByRole('link', { name: 'Accueil' }).click();
  await page.waitForTimeout(15000);
  await waitForLoadingToSkeleton({ page });
  await expect(page.getByRole('button', { name: 'Ajouter une annonce' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter une annonce' }).click();
  await expect(page.getByRole('link', { name: 'Proposer un objet', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Demander un objet', exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Proposer un service', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Demander un service', exact: true })
  ).toBeVisible();

  // Vérifie qu'il y a au moins 4 cartes dans le feed
  const cards = page.locator('.masonry-wall .masonry-item');
  const count = await cards.count(); await page.goto('http://localhost:3000/feed');
  expect(count).toBeGreaterThanOrEqual(4);
});



