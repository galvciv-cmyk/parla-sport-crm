---
name: emilkowalski
description: >-
  Principios de diseño, craft, micro-interacciones, animaciones fluidas y física de movimiento inspirados en Emil Kowalski (creador de Vaul, Sonner y 'Animations on the Web').
  Úsalo al diseñar componentes de interfaz, animaciones CSS, transiciones de modales, skeletons y feedback táctil de alta gama.
---

# Emil Kowalski Design & Micro-Interactions Skill

Esta skill aplica la filosofía de diseño, interacción y artesanía visual (*craft*) de Emil Kowalski:

## 1. Reglas de Animación y Física de Movimiento
- **Nada de animaciones lineales mecánicas:** Nunca uses `transition: all 0.3s ease` indiscriminadamente.
- **Curvas de aceleración naturales:**
  - Salida rápida, frenada suave: `cubic-bezier(0.16, 1, 0.3, 1)` (ideal para modales, paneles y aperturas).
  - Efecto de resorte / elasticidad suave: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Duraciones humanas:**
  - Micro-interacciones (hover, presionar botón): `120ms - 180ms`.
  - Transiciones de estado (abrir modal, cambio de pestaña): `250ms - 350ms`.
  - Grandes cambios de página o vistas complejas: `400ms - 500ms`.

## 2. Feedback Táctil y Estados de Presión (Press States)
- Al hacer clic o tocar un botón: escala suave inmediata (`transform: scale(0.97)` o `scale(0.98)`).
- Respuesta inmediata: el usuario debe sentir que la interfaz reacciona instantáneamente antes de que termine de cargar el servidor.

## 3. Filosofía de Notificaciones (Toasts estilo Sonner)
- Apilables, con altura dinámica fluida.
- Expansibles al pasar el cursor o interactuar.
- No deben bloquear la interacción del usuario con el resto de la pantalla.

## 4. Rendimiento y Accesibilidad
- Animar únicamente propiedades aceleradas por GPU: `transform` y `opacity`.
- Respetar siempre `@media (prefers-reduced-motion: reduce)` desactivando movimientos agresivos para usuarios sensibles.

## 5. Skeleton Loaders (Caída de Esqueleto)
- Shimmer suave con gradientes de fondo que reflejan la forma real del componente antes de cargar los datos.
- Evita saltos de diseño abruptos (layout shifts).
