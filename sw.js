/**
 * RPG Life OS — Service Worker
 * Enables offline support and caching for PWA.
 */

const CACHE_NAME = 'rpg-life-os-v43-cinematic';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/ui/style.css',
    './src/ui/style-phase2.css',
    './src/ui/style-phase3.css',
    './src/ui/style-badges.css',
    './src/ui/style-identity.css',    // v3.0
    './src/ui/style-themes.css',
    './src/ui/style-hubs.css',          // v4.0 Hub World
    './src/ui/style-splash.css',        // v4.3 Splash + Transitions
    './src/ui/app.js?v=4.3.0',
    './src/ui/splash.js',
    './assets/hubs/citadel_map.webp',
    './assets/hubs/guild_interior.webp',
    './assets/hubs/soul_sea_interior.webp',
    './assets/hubs/videos/citadel_map.webm',
    './assets/hubs/videos/guild_interior.webm',
    './assets/hubs/videos/soul_sea_interior.webm',
    './src/engine/core.js',
    './src/engine/gamification.js',
    './src/engine/audio.js',
    './src/config/badges.js',
    './src/modules/quests.js',
    './src/modules/battle.js',
    './src/modules/taverna.js',
    './src/modules/profile.js',       // v3.0
    './src/modules/market.js',        // v3.1
    './src/ui/style-campaign.css',
    './src/ui/style-player.css',
    './src/modules/campaign_map.js',
    './src/engine/music_player.js',
    './src/ui/audio_player_ui.js',
    './src/firebase/auth.js',
    './src/firebase/db.js',
    './src/firebase/firebase.js',
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

// Fetch: Network-first strategy (sempre busca do servidor primeiro se houver internet)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).then((response) => {
            // Cache successful responses
            if (response && response.status === 200 && response.type === 'basic') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => {
            // Se falhar (offline), tenta buscar do cache
            return caches.match(event.request).then((cached) => {
                if (cached) return cached;
                // Fallback final
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
