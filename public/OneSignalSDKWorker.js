/* =============================================
   PARLA SPORT CRM — OneSignal & PWA Unified Worker
   ============================================= */

// 1. Cargar el SDK Worker oficial de OneSignal
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// 2. Cargar nuestro Service Worker para Cache offline y eventos PWA
importScripts("/sw.js");
