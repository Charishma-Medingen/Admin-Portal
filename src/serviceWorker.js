// src/serviceWorkerRegistration.js

// This code handles the registration of the service worker
export function register() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js') // Path to your service worker file
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }
  
  export function unregister() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.unregister();
        })
        .catch((error) => {
          console.error('Service Worker unregistration failed:', error);
        });
    }
  }
  