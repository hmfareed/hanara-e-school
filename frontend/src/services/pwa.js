import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return registration;
    } catch (err) {
      console.warn('Service Worker registration failed:', err);
    }
  }
  return null;
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.ready;

  // Fetch VAPID public key from backend
  const keyRes = await api.get('/notifications/vapid-public-key');
  const vapidPublicKey = keyRes.data?.data?.publicKey;

  if (!vapidPublicKey) {
    throw new Error('Could not retrieve VAPID public key from server.');
  }

  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  // Subscribe with PushManager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });

  const subJson = subscription.toJSON();

  // Send subscription to backend
  await api.post('/notifications/subscribe', {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
    userAgent: navigator.userAgent,
  });

  return subscription;
}

export async function unsubscribeFromPushNotifications() {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
    await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
  }
}

export async function checkPushSubscriptionStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (e) {
    return false;
  }
}
