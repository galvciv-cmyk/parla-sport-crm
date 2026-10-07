---
name: playwright
description: >-
  Guía completa para escribir, ejecutar y depurar pruebas end-to-end (E2E) con Playwright en 11FUT MANAGER.
  Úsalo cuando el usuario pida probar flujos de login, tácticas interactivas, generación de reportes o rendimiento responsive.
---

# Playwright E2E Testing Skill para 11FUT MANAGER

Esta skill guía la ejecución y autoría de pruebas automatizadas E2E sobre el entorno Vite y Firebase de 11FUT MANAGER.

## Configuración y Comandos Clave

- **Ejecutar pruebas:** `npx playwright test`
- **Modo UI interactivo:** `npx playwright test --ui`
- **Depuración con Playwright Inspector:** `npx playwright test --debug`
- **Ver reporte HTML:** `npx playwright show-report`

## Buenas Prácticas para 11FUT MANAGER

1. **Localizadores semánticos y accesibles:**
   - Priorizar `page.getByRole('button', { name: /ingresar/i })` o `page.getByLabel()`.
   - Si no hay rol disponible, usar `page.locator('#email-input')` o atributos `data-testid`.

2. **Manejo de estado asíncrono y Canvas:**
   - La pizarra táctil usa Canvas y eventos táctiles (`pointerdown`, `pointermove`). Emular eventos con `page.mouse` o touch emulation en mobile.

3. **Pruebas de Autenticación y Firebase:**
   - Probar el flujo de validación de contraseñas/PIN, control de rate limiting y bloqueo de emails desechables.

4. **Capturas de pantalla y regresión visual:**
   - Emular vistas móviles (`iPhone 14`, `Pixel 7`) para verificar que no haya desbordamiento horizontal.
