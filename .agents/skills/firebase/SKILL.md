---
name: firebase
description: >-
  Estándares de integración, seguridad, sincronización en tiempo real y arquitectura de Firebase (Firestore, Auth, Storage, Cloud Functions y Security Rules) para 11FUT MANAGER. Úsalo al trabajar con persistencia en la nube, autenticación, protección contra BOLA, emuladores y optimización de cuotas.
---

# Firebase Engineering & Security Skill (11FUT MANAGER)

Esta skill define las directrices y estándares para interactuar con Firebase de manera segura, resiliente y de alto rendimiento.

## 1. Arquitectura de Datos y Colecciones
- **`usuarios/{uid}`**: Datos privados de cada club/entrenador (plantel, estadísticas, historial, configuraciones, categorías).
  - Solo el propietario autenticado (`request.auth.uid == uid`) o el SuperAdmin tienen permisos de lectura y escritura.
- **`publicos/{pubId}`**: Vistas públicas sanitizadas para compartir perfiles de clubes, tácticas o fichas de jugadores.
  - Nunca almacenar credenciales, PINs en texto claro ni hashes de acceso directo en este nodo.
  - Usar nombres de clave deterministas (`usr_<uid>`, `usr_<pinHash>`, `email_<sanitized>`).

## 2. Sanitización y Resiliencia de Payload (Evitar Error 400 de Firestore)
- Firestore rechaza valores `undefined`, funciones y strings masivos (>1MB total por documento).
- Usar siempre la función `sanitizarParaFirestore(obj)` antes de enviar:
  - Eliminar propiedades con valores `undefined` o de tipo `function`.
  - Excluir o recortar strings masivos (>250KB) que no sean URLs (por ejemplo, imágenes en base64 no optimizadas).
  - Sanitizar arrays anidados y objetos profundos de forma recursiva.

## 3. Sincronización Asíncrona sin Bloquear la UI
- **Local-First:** Guardar siempre en `localStorage` de forma inmediata (<1ms) y disparar la sincronización en nube en segundo plano con debounce (450ms).
- **Timeouts Defensivos:** Todo guardado en Firestore debe estar envuelto en un `Promise.race` con un timeout máximo de 4 a 5 segundos para que una red inestable jamás congele la navegación.
- **Manejo de Cierre de Pestaña:** Utilizar `beforeunload` con guardado preventivo local y `navigator.sendBeacon` o `merge: true` seguro.
- **Caché Inteligente:** Al consultar documentos públicos (`publicos/{id}`), implementar caché en cliente (ej. 15 minutos en localStorage) para reducir lecturas redundantes en Firestore.

## 4. Blindaje de Reglas de Seguridad (Firestore Rules)
- Prevenir vulnerabilidades **BOLA (Broken Object Level Authorization)**:
  ```text
  match /usuarios/{userId} {
    allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.email == 'linarezmiguel@gmail.com');
  }
  match /publicos/{publicId} {
    allow read: if true;
    allow write: if request.auth != null && (
      request.auth.uid == publicId.replace('usr_', '') ||
      request.auth.token.email == 'linarezmiguel@gmail.com'
    );
  }
  ```
- No permitir nunca escritura abierta (`allow write: if true;`).

## 5. Emuladores y Entorno Local
- Para desarrollo y pruebas locales sin consumir cuota de producción:
  - Firestore Emulator: `127.0.0.1:8082`
  - Auth Emulator: `127.0.0.1:9099`
  - Conexión dinámica mediante parámetro URL `?use_emulator=true` o flag en `localStorage` (`11fut_use_emulator`).

## 6. Pruebas y Mocking
- En pruebas unitarias (Vitest), mockear los métodos del SDK modular de Firebase (`doc`, `setDoc`, `getDoc`, `getFirestore`, `getAuth`) para evitar llamadas de red accidentales y asegurar velocidad en CI/CD.
