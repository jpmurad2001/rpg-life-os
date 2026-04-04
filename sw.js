/**
 * RPG Life OS — Service Worker
 * Enables offline support and caching for PWA.
 */

const CACHE_NAME = 'rpg-life-os-v27';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/ui/style.css',
    './src/ui/style-phase2.css',
    './src/ui/style-phase3.css',
    './src/ui/app.js',
    './src/engine/core.js',
    './src/engine/gamification.js',
    './src/engine/audio.js',
    './src/modules/quests.js',
    './src/modules/battle.js',
    './src/modules/taverna.js',
    './src/ui/style-campaign.css',
    './src/ui/style-player.css',
    './src/modules/campaign_map.js',
    './src/engine/music_player.js',
    './src/ui/audio_player_ui.js',
    './assets/sprites/icon-192.png',
    './assets/sprites/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(err => console.warn('[SW] Cache error:', err))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: Cache-first strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Fallback to index.html for navigation requests
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
