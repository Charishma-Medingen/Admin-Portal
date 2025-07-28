
self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log('Push received', data);
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon,
        data: { target_url: data.target_url },
      })
    );  
  });
  
  self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Close the notification when clicked
    console.log('Notification clicked', event);
    // Get the target URL from the notification data
    const targetUrl = event.notification.data.target_url;
  
    // Open the specific URL in the PWA
    event.waitUntil(
      clients.openWindow(targetUrl)  // Open the target URL from the data
    );
  });
  