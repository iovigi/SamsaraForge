self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('push', function (event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        data: data.data,
        actions: data.actions // Pass actions to the notification
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'snooze') {
        // Handle Snooze Action
        const { taskId, snoozeToken } = event.notification.data;
        // Parse API Base from SW query string
        const urlParams = new URLSearchParams(self.location.search);
        const apiBase = urlParams.get('apiBase') || 'http://localhost:5000';

        const promise = fetch(`${apiBase}/api/habits/${taskId}/snooze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: snoozeToken })
        })
            .then(res => {
                if (!res.ok) throw new Error('Snooze failed');
                console.log('Task snoozed successfully');
            })
            .catch(err => console.error('Snooze Error:', err));

        event.waitUntil(promise);
    } else {
        // Default click (open app)
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});
