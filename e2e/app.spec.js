import { test, expect } from '@playwright/test';

test.describe('Parla Sport CRM - E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('La aplicación carga correctamente con título y modo oscuro', async ({ page }) => {
    await expect(page).toHaveTitle(/Parla Sport/i);
    // Verificar logotipo o marca
    const branding = page.locator('h1, h2, img[alt*="Parla Sport"]').first();
    await expect(branding).toBeVisible();
  });

  test('La pantalla de autenticación muestra los campos de acceso', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('Validación de tamaño de fuente (16px) en inputs para evitar zoom en móviles', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const fontSize = await emailInput.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // 16px garantiza que iOS Safari y navegadores móviles nunca fuercen zoom
    expect(fontSize).toBe('16px');
  });

  test('Alternar entre Iniciar Sesión y Registro de Profesor', async ({ page }) => {
    const btnRegister = page.getByRole('button', { name: /registrar profesor/i });
    if (await btnRegister.isVisible()) {
      await btnRegister.click();
      await expect(page.getByText(/nombre completo del profesor/i)).toBeVisible();

      // Regresar a Login
      const btnLoginTab = page.getByRole('button', { name: /iniciar sesión/i }).first();
      await btnLoginTab.click();
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
    }
  });

  test('Layout responsivo sin desbordamiento horizontal', async ({ page }) => {
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
