---
name: leonxlnx
description: >-
  Estándares de arquitectura limpia, programación defensiva, protección de endpoints, rate limiting y resiliencia de datos según la metodología de Leonxlnx.
  Úsalo al estructurar servicios seguros, validar entradas de usuario, prevenir abusos en descargas/APIs y optimizar el rendimiento frontend/backend.
---

# Leonxlnx Clean Architecture & Defensive Engineering Skill

Esta skill aplica los patrones de ingeniería defensiva y robustez sistemática:

## 1. Programación Defensiva (Zero Runtime Crashes)
- Nunca asumir que un objeto o array externo existe: usar siempre Optional Chaining (`?.`) y valores por defecto seguros (`|| []`, `|| {}`).
- Validar y sanitizar toda entrada antes de procesarla o renderizarla en el DOM (`escapeHTML`, `isSafeURL`).

## 2. Rate Limiting y Protección contra Abuso
- **Request Throttling:** Limitar intentos sucesivos en endpoints críticos (login, cambio de contraseña, peticiones a base de datos).
- **Download Cooldown:** Evitar que el usuario haga spam de clics en botones de descarga (PDF, Excel, exportaciones masivas), desactivando el botón temporalmente y mostrando un estado de carga claro.
- **URL Debounce & Validation:** Comprobar que los enlaces compartidos y URLs externas pertenezcan a esquemas válidos (`https://`) y respeten límites de frecuencia.

## 3. Manejo de Estados de Carga y Errores
- Toda acción asíncrona debe reflejar 3 estados:
  1. **Idle / Preparado**
  2. **Loading / Procesando** (desactivar botón, mostrar spinner o skeleton)
  3. **Success / Error claro y accionable** (mensaje amigable que indique qué hacer).

## 4. Accesibilidad e Inputs Perfectos
- Foco visible inequívoco para navegación por teclado.
- Etiquetas vinculadas semánticamente (`for` e `id`).
- Teclado móvil óptimo (`inputmode`, `autocomplete`).
- Contenedores de error con feedback contextual visible y anunciado a lectores de pantalla.
