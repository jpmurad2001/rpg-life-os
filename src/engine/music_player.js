/**
 * RPG Life OS — Music Player Engine (v1.4: Ecos do Vazio)
 * =========================================================
 * Singleton de áudio HTML5 com playlist local e controles completos.
 * Persiste enquanto a PWA estiver aberta — navegação entre views
 * NÃO reinicia a música (o módulo JS mantém o estado em memória).
 *
 * COMO ADICIONAR FAIXAS:
 *   1. Coloque os arquivos .mp3/.ogg em /assets/sfx/musics/
 *   2. Adicione o caminho em PLAYLIST abaixo
 *   3. Adicione o nome amigável em TRACK_NAMES (mesma posição)
 */

// ============================================================
//   PLAYLIST CONFIG — edite aqui suas faixas
//   Caminhos relativos à raiz do projeto (ex: /assets/sfx/musics/)
// ============================================================
export const PLAYLIST = [
  '/assets/sfx/musics/Back_to_the_Hearth.mp3',
  '/assets/sfx/musics/Beneath_The_Ancient_Gate.mp3',
  '/assets/sfx/musics/Crown_of_Sun_and_Steel.mp3',
  '/assets/sfx/musics/First_Light_in_the_Valley.mp3',
  '/assets/sfx/musics/Morning_on_the_Meadow.mp3',
  '/assets/sfx/musics/Resting_At_The_Edge.mp3',
  '/assets/sfx/musics/Sailing_To_The_First_Horizon.mp3',
  '/assets/sfx/musics/The_Hearth_at_Sunset.mp3',
  '/assets/sfx/musics/The_View_from_Oakhaven.mp3',
  '/assets/sfx/musics/Where_the_Tide_Breaks.mp3',
  '/assets/sfx/musics/Sunrise_at_the_South_Gate.mp3',
  '/assets/sfx/musics/A_Restful_Night_at_the_Iron_Tankard.mp3',
  '/assets/sfx/musics/The_Temple_at_Dawn.mp3',
  '/assets/sfx/musics/Lanterns_at_Dawn.mp3',
  '/assets/sfx/musics/Temple_Path_at_Dawn.mp3',
];

export const TRACK_NAMES = [
  'Back to the Hearth',
  'Beneath the Ancient Gate',
  'Crown of Sun and Steel',
  'First Light in the Valley',
  'Morning on the Meadow',
  'Resting at the Edge',
  'Sailing to the First Horizon',
  'The Hearth at Sunset',
  'The View from Oakhaven',
  'Where the Tide Breaks',
  'Sunrise at the South Gate',
  'A Restful Night at the Iron Tankard',
  'The Temple at Dawn',
  'Lanterns at Dawn',
  'Temple Path at Dawn',
];

// ============================================================
//   SPOTIFY CONFIG
// ============================================================
const SPOTIFY_STORAGE_KEY = 'rpg_spotify_playlist_id';
const SPOTIFY_DEFAULT_ID  = '37i9dQZF1DX8Uebhn9wzrS'; // ambient dark fantasy

// ============================================================
//   STATE INTERNO (singleton)
// ============================================================
let _audio        = null;   // Criado lazy para respeitar autoplay policy
let _idx          = 0;      // Índice da faixa atual
let _playing      = false;  // Estado de reprodução
let _volume       = 0.2;    // Volume inicial
let _userReady    = false;  // Primeira interação do usuário (desbloqueio autoplay)
let _errorCount   = 0;      // Guard anti-loop: interrompe após toda a playlist falhar

// ============================================================
//   AUDIO INSTANCE (lazy)
// ============================================================
function _getAudio() {
  if (!_audio) {
    _audio = new Audio();
    _audio.volume  = _volume;
    _audio.preload = 'metadata';

    // Auto-advance ao terminar
    _audio.addEventListener('ended', () => {
      const next = (_idx + 1) % PLAYLIST.length;
      _loadTrack(next, true);
    });

    // Erro de faixa: tenta a próxima, mas para se toda a playlist falhar
    _audio.addEventListener('error', () => {
      _errorCount++;
      const path = PLAYLIST[_idx] ?? '(vazia)';
      console.warn(`[MusicPlayer] Faixa indisponível (${_errorCount}/${PLAYLIST.length}):`, path);

      if (_errorCount >= PLAYLIST.length) {
        // Todas as faixas falharam — para de tentar para não fazer loop infinito
        console.error('[MusicPlayer] Nenhuma faixa pôde ser carregada. Verifique os arquivos em /assets/sfx/musics/');
        _playing = false;
        _emit();
        return;
      }

      setTimeout(() => {
        const nextIdx = (_idx + 1) % PLAYLIST.length;
        _loadTrack(nextIdx, _playing);
      }, 300);
    });

    // Sync estado com UI
    _audio.addEventListener('play',  () => { _playing = true;  _emit(); });
    _audio.addEventListener('pause', () => { _playing = false; _emit(); });
    _audio.addEventListener('timeupdate', () => _emitTime());
  }
  return _audio;
}

// ============================================================
//   EVENT BUS (window custom events)
// ============================================================
function _emit() {
  window.dispatchEvent(new CustomEvent('musicplayer:update', {
    detail: getState(),
  }));
}

function _emitTime() {
  const a = _getAudio();
  window.dispatchEvent(new CustomEvent('musicplayer:time', {
    detail: {
      currentTime: a.currentTime,
      duration:    a.duration || 0,
    },
  }));
}

// ============================================================
//   LOAD TRACK
// ============================================================
function _loadTrack(idx, autoplay = false) {
  if (!PLAYLIST.length) return;
  _idx = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;

  // Reseta contador de erros ao carregar uma faixa manualmente
  if (autoplay === false || _userReady) _errorCount = 0;

  const audio  = _getAudio();
  audio.src    = PLAYLIST[_idx];
  audio.currentTime = 0;
  audio.load();

  if (autoplay && _userReady) {
    audio.play().catch(err => console.warn('[MusicPlayer] Autoplay bloqueado:', err));
  }

  _emit();
}

// ============================================================
//   PUBLIC API
// ============================================================

/** Retorna estado atual para sync da UI */
export function getState() {
  const a = _getAudio();
  return {
    isPlaying:    _playing,
    currentIdx:   _idx,
    trackName:    TRACK_NAMES[_idx] ?? _filenameFrom(PLAYLIST[_idx]),
    totalTracks:  PLAYLIST.length,
    volume:       _volume,
    spotifyId:    localStorage.getItem(SPOTIFY_STORAGE_KEY) ?? SPOTIFY_DEFAULT_ID,
    duration:     a.duration      || 0,
    currentTime:  a.currentTime   || 0,
  };
}

/** Inicia reprodução (requer gesto do usuário na primeira chamada) */
export function play() {
  _userReady  = true;
  _errorCount = 0; // permite nova tentativa se o usuário pressiona Play manualmente
  const audio = _getAudio();

  // Sem faixa carregada → carrega a primeira
  if (!audio.src || audio.src === window.location.href) {
    if (!PLAYLIST.length) return;
    audio.src = PLAYLIST[_idx];
    audio.load();
  }

  audio.play().catch(err => console.warn('[MusicPlayer] Play bloqueado:', err));
}

export function pause() {
  _getAudio().pause();
}

export function toggle() {
  if (_playing) pause();
  else play();
}

export function next() {
  _userReady = true;
  _loadTrack(_idx + 1, _playing || _userReady);
}

export function prev() {
  _userReady = true;
  // Se passou mais de 3s, volta ao início da faixa; senão, faixa anterior
  const a = _getAudio();
  if (a.currentTime > 3) {
    a.currentTime = 0;
    _emit();
  } else {
    _loadTrack(_idx - 1, _playing);
  }
}

export function setVolume(v) {
  _volume = Math.max(0, Math.min(1, parseFloat(v)));
  if (_audio) _audio.volume = _volume;
  _emit();
}

export function jumpTo(idx) {
  _userReady = true;
  _loadTrack(idx, _playing || _userReady);
}

export function seek(time) {
  const a = _getAudio();
  if (a.duration) a.currentTime = Math.max(0, Math.min(time, a.duration));
}

export function setSpotifyPlaylist(rawInput) {
  const match = rawInput.match(/playlist\/([A-Za-z0-9]+)/);
  const id    = match ? match[1] : rawInput.trim();
  if (!id) return;
  localStorage.setItem(SPOTIFY_STORAGE_KEY, id);
  _emit();
}

/** Pré-carrega metadados da faixa 0 sem iniciar autoplay */
export function init() {
  if (!PLAYLIST.length) {
    console.warn('[MusicPlayer] PLAYLIST vazia — adicione arquivos em /assets/sfx/musics/');
    return;
  }
  const audio = _getAudio();
  if (!audio.src || audio.src === window.location.href) {
    // Só atribui src se ainda não tem nenhum
    audio.src     = PLAYLIST[0];
    audio.preload = 'metadata';
  }
}

// ============================================================
//   HELPERS
// ============================================================
function _filenameFrom(path = '') {
  return path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}
