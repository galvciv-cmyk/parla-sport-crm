# ⚽ Parla Sport CRM - Sistema de Gestión Deportiva

Sistema web CRM profesional de gestión deportiva para la academia **Parla Sport**, diseñado para coordinar entrenamientos personalizados en formatos **1-1, 1-2 y 1-3**, control estricto de disponibilidad de profesores, prevención de choque de horarios, gestión de ausencias y notificaciones omnicanal.

![Parla Sport CRM](public/logo.png)

---

## 🚀 Tecnologías Utilizadas

- **Frontend**: React 19 + Vite (Modulares JSX & Hooks)
- **Estilos**: Vanilla CSS con paleta **Azul Marino Profundo & Bordes Dorados** + Glassmorphic UI
- **Backend & Base de Datos**: Firebase JS SDK (Spark Plan gratuito - Auth & Firestore) + Fallback local persistente
- **Emuladores**: Firebase Local Emulator Suite con soporte completo en Docker
- **Instalación PWA**: Progressive Web App con Service Worker para instalación en escritorios y móviles + Notificaciones Push
- **Notificaciones**: Sistema Omnicanal (In-App Bell Badge, EmailJS / Resend Client Dispatch, PWA Push)

---

## 🎨 Código de Colores de la Academia (Estados de Sesiones)

Basado en la operativa real de la academia:

- ⚪ **Blanco** (`sin_confirmar`): Sesión programada sin confirmar.
- 🟡 **Amarillo** (`confirmada`): Sesión confirmada por el tutor/jugador.
- 🟠 **Naranja** (`realizada`): Entrenamiento ejecutado por el profesor.
- 🟢 **Verde** (`pagada`): Sesión liquidada y pagada.
- 🔴 **Rojo** (`cancelada`): Sesión cancelada.

---

## 🔑 Roles y Accesos

- **Administrador Maestro (`admin@parlasport.com`)**:
  - Dashboard con métricas de rendimiento y sesiones completadas por entrenador.
  - CRUD de Jugadores y Fichas Técnicas (Foto, edad, posición, pierna hábil, observaciones).
  - CRUD de Entrenadores y editor de bloques semanales de disponibilidad.
  - Programación de sesiones 1-1, 1-2 y 1-3 con filtro automático anti-choque.
  - Reasignación de ausencias (dispara notificaciones al nuevo profesor).
- **Entrenador (Cualquier otro correo registrado)**:
  - Calendario individual interactivo.
  - Acceso inmediato a las **Fichas Técnicas** de los niños asignados a cada clase.
  - Actualización rápida de estados (⚪, 🟡, 🟠, 🟢).

---

## 🛠️ Instalación y Ejecución Local

### 1. Clonar el repositorio e instalar dependencias:
```bash
cd parla-sport-crm
npm install
```

### 2. Iniciar el Servidor de Desarrollo:
```bash
npm run dev
```
Accede en tu navegador a: `http://localhost:5173/`

---

## 🐳 Despliegue con Docker & Firebase Local Emulators

El proyecto incluye soporte containerizado completo para no afectar datos de producción:

```bash
npm run docker:up
# O ejecútalo con: docker compose up -d
```

- **Aplicación Web**: `http://localhost:5173/`
- **Panel Visual de Emuladores Firebase**: `http://localhost:4000/`

---

## 📄 Estructura del Proyecto

```
parla-sport-crm/
├── public/
│   ├── logo.png              # Logo oficial transparente de Parla Sport
│   ├── favicon.png           # Icono con la P oficial en blanco sobre azul y borde dorado
│   ├── manifest.json         # Configuración PWA
│   └── sw.js                 # Service Worker offline y notificaciones Push
├── src/
│   ├── components/
│   │   ├── admin/            # Dashboard, Jugadores, Entrenadores, Programador
│   │   ├── auth/             # LoginScreen (Portal de inicio por correo maestro)
│   │   ├── coach/            # Calendario individual y Modal de Ficha Técnica
│   │   ├── common/           # Modal reutilizable desplegado al 100%
│   │   └── layout/           # Navbar y Sidebar adaptativos
│   ├── context/              # AuthContext, DataContext, NotificationContext
│   ├── services/             # firebase.js, emailService.js, pwaService.js
│   ├── utils/                # mockData.js, scheduling.js (Motor anti-choques)
│   ├── App.jsx
│   └── index.css
├── Dockerfile
├── Dockerfile.emulator
├── docker-compose.yml
├── firebase.json
└── package.json
```

---

## 📝 Licencia
Desarrollado para **Parla Sport Academy**. Todos los derechos reservados.
