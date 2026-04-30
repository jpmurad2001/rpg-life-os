/**
 * RPG Life OS — Splash Screen & Cinematic Transitions
 * v4.3 — Crossfade Login → Splash → Hub
 *
 * Fluxo:
 * 1. Login bem-sucedido → auth-screen faz fade-out
 * 2. Splash aparece enquanto Firebase carrega
 * 3. Loading concluído → splash faz fade-out, hub aparece por baixo
 */

// ============================================================
//   LOADING MESSAGES — rotacionam a cada 2s
// ============================================================
const LOADING_MESSAGES = [
  'Sincronizando com o Feitiço',
  'Acessando o Mar da Alma',
  'Calculando Recompensas',
  'Invocando o Grimório',
  'Atravessando o Portal',
  'Carregando a Guilda',
  'Despertando o Caçador',
  'Forjando o Destino',
  'Consultando os Oráculos',
  'Preparando a Cidadela',
];

let _msgIndex    = 0;
let _msgTimer    = null;
let _splashEl    = null;
let _msgEl       = null;

// ============================================================
//   CREATE SPLASH DOM
// ============================================================
function createSplashElement() {
  const el = document.createElement('div');
  el.id = 'splash-screen';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-label', 'Carregando Shadow Slave Life OS');

  el.innerHTML = `
    <div class="splash-icon-wrap">
      <img
        class="splash-icon"
        src="assets/sprites/icon-512.png"
        alt="Shadow Slave Life OS"
        draggable="false"
      />
    </div>

    <div class="splash-title">Shadow Slave<br/>Life OS</div>

    <div class="splash-bar-wrap" aria-hidden="true">
      <div class="splash-bar"></div>
    </div>

    <p class="splash-message" id="splash-msg">
      Entrando no Vazio<span class="splash-dots" aria-hidden="true">...</span>
    </p>
  `;

  return el;
}

// ============================================================
//   MESSAGE ROTATOR
// ============================================================
function startMessageRotation() {
  _msgTimer = setInterval(() => {
    if (!_msgEl) return;

    // Fade out current message
    _msgEl.classList.add('fade');

    setTimeout(() => {
      if (!_msgEl) return;
      _msgIndex = (_msgIndex + 1) % LOADING_MESSAGES.length;
      _msgEl.innerHTML =
        LOADING_MESSAGES[_msgIndex] +
        '<span class="splash-dots" aria-hidden="true">...</span>';
      _msgEl.classList.remove('fade');
    }, 300);
  }, 2000);
}

function stopMessageRotation() {
  clearInterval(_msgTimer);
  _msgTimer = null;
}

// ============================================================
//   PUBLIC API
// ============================================================

/**
 * showSplash()
 * Chamado logo após o login bem-sucedido.
 * Faz o auth-screen desaparecer e monta o splash.
 */
export function showSplash() {
  // 1. Fade out auth screen
  const authEl = document.getElementById('auth-screen');
  if (authEl) {
    authEl.classList.add('fade-out');
    // Remove do fluxo após a animação terminar (não usa display:none imediato)
    setTimeout(() => {
      authEl.classList.add('hidden');
      authEl.classList.remove('fade-out');
    }, 650);
  }

  // 2. Create and inject splash
  _splashEl = createSplashElement();
  document.body.appendChild(_splashEl);

  // 3. Start message rotation
  _msgEl = document.getElementById('splash-msg');
  _msgIndex = 0;
  startMessageRotation();
}

/**
 * hideSplash()
 * Chamado quando os dados do Firebase estão carregados e o hub está pronto.
 * Faz o splash desaparecer com fade, revelando o hub por baixo.
 * Retorna uma Promise que resolve quando o fade terminar.
 */
export function hideSplash() {
  return new Promise(resolve => {
    if (!_splashEl) { resolve(); return; }

    stopMessageRotation();

    // Fade out splash — o hub já está renderizado por baixo
    _splashEl.classList.add('fade-out');

    // Remove do DOM após a animação (800ms matches CSS transition)
    setTimeout(() => {
      _splashEl?.remove();
      _splashEl = null;
      _msgEl    = null;
      resolve();
    }, 850);
  });
}

/**
 * isSplashVisible()
 */
export function isSplashVisible() {
  return !!_splashEl;
}
