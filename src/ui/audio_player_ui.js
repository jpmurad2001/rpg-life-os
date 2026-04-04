/**
 * RPG Life OS — Audio Player UI (v1.4: Ecos do Vazio)
 * =====================================================
 * Bottom bar retrátil com duas abas: BGM Local e Spotify.
 * Injeta-se UMA ÚNICA VEZ no DOM; persiste entre navegações.
 *
 * INJEÇÃO: chamado em src/ui/app.js → _onUserLogin()
 * DOM target: <div id="audio-bar-root"> em index.html
 */

import {
  init, getState, play, pause, toggle, next, prev,
  setVolume, jumpTo, seek, setSpotifyPlaylist,
  PLAYLIST, TRACK_NAMES,
} from '../engine/music_player.js';

// ============================================================
//   UI STATE
// ============================================================
let _expanded  = false;
let _activeTab = 'bgm'; // 'bgm' | 'spotify'

// ============================================================
//   BUILD HTML
// ============================================================
function _buildHTML() {
  return `
    <div id="audio-bar" class="audio-bar" role="region" aria-label="Player de Música">

      <!-- Tira colapsada — sempre visível -->
      <div class="audio-bar__strip" id="audio-strip">

        <button class="audio-bar__expand-btn" id="audio-toggle-expand"
                aria-label="Expandir/recolher player" title="Expandir player">
          <span class="audio-expand-icon" id="audio-arrow">▲</span>
        </button>

        <div class="audio-bar__controls">
          <button class="audio-ctrl" id="audio-prev" aria-label="Faixa anterior" title="Anterior">⏮</button>
          <button class="audio-ctrl audio-ctrl--play" id="audio-play" aria-label="Play / Pause">▶</button>
          <button class="audio-ctrl" id="audio-next" aria-label="Próxima faixa" title="Próxima">⏭</button>
        </div>

        <div class="audio-bar__track-info">
          <span class="audio-note-icon" id="audio-note-icon" aria-hidden="true">🎵</span>
          <span class="audio-track-name" id="audio-track-name">─ ─ ─</span>
        </div>

        <div class="audio-bar__right">
          <!-- Progress time -->
          <span class="audio-time" id="audio-time"></span>
          <!-- Volume -->
          <div class="audio-volume-wrap" aria-label="Volume">
            <button class="audio-vol-icon" id="audio-vol-btn" aria-label="Mutar">🔈</button>
            <input class="audio-volume-slider" id="audio-volume"
                   type="range" min="0" max="1" step="0.02" value="0.20"
                   aria-label="Volume" />
          </div>
          <!-- Ocultar barra -->
          <button class="audio-bar__hide-btn" id="audio-hide-btn"
                  aria-label="Ocultar player" title="Ocultar barra de música">×</button>
        </div>

      </div><!-- /strip -->

      <!-- Painel expandido -->
      <div class="audio-bar__panel" id="audio-panel" aria-hidden="true" hidden>

        <!-- Progress bar -->
        <div class="audio-progress-wrap">
          <input class="audio-progress-slider" id="audio-seek"
                 type="range" min="0" max="100" step="0.5" value="0"
                 aria-label="Posição da faixa" />
        </div>

        <!-- Abas -->
        <div class="audio-tabs" role="tablist">
          <button class="audio-tab audio-tab--active" id="tab-bgm"
                  role="tab" data-tab="bgm" aria-selected="true">
            🎮 BGM do Jogo
          </button>
          <button class="audio-tab" id="tab-spotify"
                  role="tab" data-tab="spotify" aria-selected="false">
            🎵 Spotify
          </button>
        </div>

        <!-- Conteúdo: BGM -->
        <div class="audio-tab-content" id="tab-content-bgm" role="tabpanel">
          <div class="audio-tracklist" id="audio-tracklist"></div>
        </div>

        <!-- Conteúdo: Spotify -->
        <div class="audio-tab-content audio-tab-content--hidden"
             id="tab-content-spotify" role="tabpanel">
          <div class="spotify-wrap">
            <iframe id="spotify-iframe"
                    class="spotify-iframe"
                    src=""
                    title="Spotify Player"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    frameborder="0"
                    allowtransparency="true">
            </iframe>
            <div class="spotify-change-bar">
              <input class="form-input spotify-input" id="spotify-id-input"
                     type="text" placeholder="ID ou URL da playlist do Spotify" />
              <button class="btn-rp btn-rp--ghost spotify-apply-btn" id="btn-spotify-apply">
                ✔ Aplicar
              </button>
            </div>
          </div>
        </div>

      </div><!-- /panel -->

    </div><!-- /audio-bar -->
  `;
}

// ============================================================
//   BUILD TRACKLIST
// ============================================================
function _buildTracklist() {
  const list = document.getElementById('audio-tracklist');
  if (!list || list.dataset.built) return;

  list.innerHTML = '';

  if (PLAYLIST.length === 0) {
    list.innerHTML = `
      <div class="audio-empty-state">
        <div style="font-size:1.5rem; margin-bottom:8px;">🎵</div>
        <p>Nenhuma faixa configurada.<br/>
           Adicione arquivos .mp3 em <code>/assets/sfx/musics/</code><br/>
           e cadastre os caminhos em <code>src/engine/music_player.js → PLAYLIST</code>.
        </p>
      </div>`;
    return;
  }

  PLAYLIST.forEach((path, i) => {
    const name = TRACK_NAMES[i] ?? path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const btn  = document.createElement('button');
    btn.className       = 'tracklist-item';
    btn.dataset.idx     = i;
    btn.setAttribute('aria-label', `Tocar: ${name}`);
    btn.innerHTML = `
      <span class="tracklist-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="tracklist-name">${name}</span>
      <span class="tracklist-play-icon" aria-hidden="true">▶</span>
    `;
    btn.addEventListener('click', () => jumpTo(i));
    list.appendChild(btn);
  });

  list.dataset.built = 'true';
}

// ============================================================
//   UPDATE UI
// ============================================================
function _updateUI(state) {
  // Play button
  const playBtn = document.getElementById('audio-play');
  if (playBtn) {
    playBtn.textContent = state.isPlaying ? '⏸' : '▶';
    playBtn.classList.toggle('audio-ctrl--playing', state.isPlaying);
  }

  // Track name
  const trackName = document.getElementById('audio-track-name');
  if (trackName) trackName.textContent = state.trackName;

  // Note animation
  const noteIcon = document.getElementById('audio-note-icon');
  if (noteIcon) {
    noteIcon.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
  }

  // Volume slider
  const volSlider = document.getElementById('audio-volume');
  if (volSlider && document.activeElement !== volSlider) {
    volSlider.value = state.volume;
  }

  // Volume icon
  const volBtn = document.getElementById('audio-vol-btn');
  if (volBtn) {
    volBtn.textContent = state.volume === 0 ? '🔇' : state.volume < 0.4 ? '🔈' : '🔊';
  }

  // Active track in tracklist
  document.querySelectorAll('.tracklist-item').forEach((el) => {
    el.classList.toggle('tracklist-item--active', Number(el.dataset.idx) === state.currentIdx);
  });

  // Topbar button: indicador de tocando
  document.getElementById('topbar-bgm-btn')
    ?.classList.toggle('bgm-playing', state.isPlaying);

  // Spotify iframe src
  _updateSpotify(state.spotifyId);
}

function _updateProgress({ currentTime, duration }) {
  // Seek slider
  const seek = document.getElementById('audio-seek');
  if (seek && document.activeElement !== seek) {
    seek.value = duration > 0 ? (currentTime / duration) * 100 : 0;
  }

  // Time display
  const timeEl = document.getElementById('audio-time');
  if (timeEl && duration > 0) {
    timeEl.textContent = `${_fmt(currentTime)} / ${_fmt(duration)}`;
  }
}

function _updateSpotify(playlistId) {
  if (!playlistId) return;
  const iframe = document.getElementById('spotify-iframe');
  if (!iframe) return;
  const src = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;
  if (!iframe.src.includes(playlistId)) iframe.src = src;
}

function _fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ============================================================
//   EXPAND / COLLAPSE
// ============================================================
function _toggleExpand() {
  _expanded = !_expanded;

  const panel = document.getElementById('audio-panel');
  const arrow = document.getElementById('audio-arrow');
  const bar   = document.getElementById('audio-bar');

  if (panel) {
    panel.hidden       = !_expanded;
    panel.ariaHidden   = String(!_expanded);
  }
  if (arrow) arrow.textContent = _expanded ? '▼' : '▲';
  if (bar)   bar.classList.toggle('audio-bar--expanded', _expanded);

  // Build tracklist on first open
  if (_expanded) _buildTracklist();
}

// ============================================================
//   TAB SWITCHING
// ============================================================
function _switchTab(tab) {
  _activeTab = tab;

  document.querySelectorAll('.audio-tab').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('audio-tab--active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  const bgm  = document.getElementById('tab-content-bgm');
  const spot = document.getElementById('tab-content-spotify');
  if (bgm)  bgm.classList.toggle('audio-tab-content--hidden', tab !== 'bgm');
  if (spot) spot.classList.toggle('audio-tab-content--hidden', tab !== 'spotify');

  // Load Spotify iframe only when that tab is opened (lazy)
  if (tab === 'spotify') {
    const state = getState();
    _updateSpotify(state.spotifyId);
  }
}

// ============================================================
//   MUTE TOGGLE
// ============================================================
let _prevVolume = 0.2;
function _toggleMute() {
  const state = getState();
  if (state.volume > 0) {
    _prevVolume = state.volume;
    setVolume(0);
  } else {
    setVolume(_prevVolume || 0.2);
  }
}

// ============================================================
//   HIDE / RESTORE BAR
// ============================================================
let _hidden = false;

function _ensureMiniBtn() {
  let btn = document.getElementById('audio-mini-restore');
  if (!btn) {
    btn = document.createElement('button');
    btn.id        = 'audio-mini-restore';
    btn.className = 'audio-mini-restore';
    btn.setAttribute('aria-label', 'Restaurar player de música');
    btn.textContent = '🎵 BGM';
    document.body.appendChild(btn);
    btn.addEventListener('click', _restoreBar);
  }
  return btn;
}

function _hideBar() {
  _hidden = true;
  const bar = document.getElementById('audio-bar');
  const btn = _ensureMiniBtn();
  if (bar) bar.classList.add('audio-bar--hidden');
  btn.classList.add('audio-mini-restore--visible');
  document.body.classList.add('audio-hidden');
}

function _restoreBar() {
  _hidden = false;
  const bar = document.getElementById('audio-bar');
  const btn = document.getElementById('audio-mini-restore');
  if (bar) bar.classList.remove('audio-bar--hidden');
  if (btn) btn.classList.remove('audio-mini-restore--visible');
  document.body.classList.remove('audio-hidden');
}

// ============================================================
//   INIT — chamado UMA VEZ em app.js → _onUserLogin()
// ============================================================
export function initAudioPlayer() {
  const root = document.getElementById('audio-bar-root');
  if (!root || document.getElementById('audio-bar')) return; // guard duplo

  // Inject HTML
  root.innerHTML = _buildHTML();

  // Init engine (carrega metadados sem autoplay)
  init();

  // ── Controls ──────────────────────────────────────────────
  document.getElementById('audio-toggle-expand')
    ?.addEventListener('click', _toggleExpand);

  // Double-click na strip para expandir/colapsar
  document.getElementById('audio-strip')
    ?.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button') && !e.target.closest('input')) {
        _toggleExpand();
      }
    });

  document.getElementById('audio-play')  ?.addEventListener('click', toggle);
  document.getElementById('audio-prev')  ?.addEventListener('click', prev);
  document.getElementById('audio-next')  ?.addEventListener('click', next);
  document.getElementById('audio-vol-btn')?.addEventListener('click', _toggleMute);

  document.getElementById('audio-hide-btn')?.addEventListener('click', _hideBar);

  // ── Topbar BGM button (desktop) ───────────────────────────
  document.getElementById('topbar-bgm-btn')?.addEventListener('click', () => {
    if (_hidden) {
      _restoreBar();
    } else {
      // Se a barra está visível mas colapsada, expande; se expandida, oculta
      if (_expanded) {
        _hideBar();
      } else {
        _toggleExpand();
      }
    }
  });

  document.getElementById('audio-volume')?.addEventListener('input', (e) => {
    setVolume(e.target.value);
  });

  document.getElementById('audio-seek')?.addEventListener('input', (e) => {
    const state = getState();
    if (state.duration > 0) {
      seek((parseFloat(e.target.value) / 100) * state.duration);
    }
  });

  // ── Tabs ──────────────────────────────────────────────────
  document.querySelectorAll('.audio-tab').forEach(btn => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
  });

  // ── Spotify ───────────────────────────────────────────────
  document.getElementById('btn-spotify-apply')?.addEventListener('click', () => {
    const raw = document.getElementById('spotify-id-input')?.value?.trim() ?? '';
    if (!raw) return;
    setSpotifyPlaylist(raw);
    _updateSpotify(getState().spotifyId);
  });

  document.getElementById('spotify-id-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-spotify-apply')?.click();
  });

  // ── Event listeners (engine → UI) ─────────────────────────
  window.addEventListener('musicplayer:update', (e) => _updateUI(e.detail));
  window.addEventListener('musicplayer:time',   (e) => _updateProgress(e.detail));

  // ── Initial render ────────────────────────────────────────
  _updateUI(getState());
  
  // Esconde o player por padrão ao iniciar o app (pedido do user)
  _hideBar();

  console.log('[AudioPlayer] Inicializado — v1.4 Ecos do Vazio');
}
