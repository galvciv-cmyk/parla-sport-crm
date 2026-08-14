/* =============================================
   PARLA SPORT CRM — OneSignal & PWA Unified Worker
   ============================================= */

// 1. Cargar el SDK Worker oficial de OneSignal desde CDN
importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");

// 2. Cargar nuestro Service Worker para Cache offline y eventos PWA
importScripts("/sw.js");
