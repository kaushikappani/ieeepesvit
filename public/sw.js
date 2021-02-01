self.addEventListener('install', e => {
    e.waitUntil(
        caches.open('static').then(cache => {
            return cache.addAll(['./images/pes192x192.ico','./images/ieee-pes-power-future2x.png'])
        })
    )
})

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(response => {
        return response || fetch(e.request);
    }))
})