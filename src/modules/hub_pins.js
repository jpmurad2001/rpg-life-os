/**
 * RPG Life OS — Hub Pin Position Editor
 * v4.2 — Drag-and-drop pin positioning with localStorage persistence.
 *
 * Allows the user to enter "edit mode" on any hub view and drag
 * the map pins to any position. Positions are saved per hub in
 * localStorage and restored on every page load.
 *
 * Usage: call initHubPins() once after the app boots.
 */

const STORAGE_KEY = 'rpg_hub_pin_positions';

// ============================================================
//   LOAD / SAVE  positions from localStorage
// ============================================================

function loadPinPositions() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function savePinPositions(positions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// ============================================================
//   APPLY  saved positions to DOM pins
// ============================================================

function applyStoredPositions() {
    const positions = loadPinPositions();
    for (const [pinId, pos] of Object.entries(positions)) {
        const pin = document.getElementById(pinId);
        if (pin) {
            pin.style.left = pos.left;
            pin.style.top  = pos.top;
            // Override the transform so translateX(-50%) doesn't misplace the restored pin
            pin.style.transform = 'translateX(-50%)';
        }
    }
}

// ============================================================
//   EDIT MODE — Toggle
// ============================================================

let _editMode = false; // global edit-mode state

function enterEditMode(hubViewEl) {
    _editMode = true;
    hubViewEl.classList.add('hub-edit-mode');

    // Mark all pins in this hub as draggable
    hubViewEl.querySelectorAll('.hub-pin').forEach(pin => {
        pin.draggable = false;          // we use pointer events, not HTML5 drag
        pin.classList.add('hub-pin--editable');
        makePinDraggable(pin, hubViewEl);
    });

    // Show the save button, hide the edit button
    hubViewEl.querySelector('.hub-edit-btn')?.classList.add('hidden');
    hubViewEl.querySelector('.hub-save-btn')?.classList.remove('hidden');
    hubViewEl.querySelector('.hub-reset-btn')?.classList.remove('hidden');

    showHubToast(hubViewEl, '✏️ Modo edição ativo — arraste os ícones');
}

function exitEditMode(hubViewEl) {
    _editMode = false;
    hubViewEl.classList.remove('hub-edit-mode');

    hubViewEl.querySelectorAll('.hub-pin').forEach(pin => {
        pin.classList.remove('hub-pin--editable');
        removePinDrag(pin);
    });

    hubViewEl.querySelector('.hub-edit-btn')?.classList.remove('hidden');
    hubViewEl.querySelector('.hub-save-btn')?.classList.add('hidden');
    hubViewEl.querySelector('.hub-reset-btn')?.classList.add('hidden');

    // Persist positions
    const positions = loadPinPositions();
    hubViewEl.querySelectorAll('.hub-pin').forEach(pin => {
        positions[pin.id] = {
            left: pin.style.left,
            top:  pin.style.top,
        };
    });
    savePinPositions(positions);

    showHubToast(hubViewEl, '💾 Posições salvas!');
}

function resetHubPins(hubViewEl) {
    // Remove stored positions for pins in this hub
    const positions = loadPinPositions();
    hubViewEl.querySelectorAll('.hub-pin').forEach(pin => {
        delete positions[pin.id];
        pin.style.left      = '';
        pin.style.top       = '';
        pin.style.transform = '';
    });
    savePinPositions(positions);
    showHubToast(hubViewEl, '↩️ Posições resetadas');
}

// ============================================================
//   DRAG LOGIC — pointer events (works mouse + touch)
// ============================================================

// WeakMap stores the remove function per pin
const _dragCleanup = new WeakMap();

function makePinDraggable(pin, container) {
    let startX, startY, origLeft, origTop, isDragging = false;

    // Prevent click navigation while editing
    const blockNav = e => { if (_editMode) e.stopImmediatePropagation(); };
    pin.addEventListener('click', blockNav, true);

    const onPointerDown = e => {
        if (!_editMode) return;
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        pin.classList.add('hub-pin--dragging');
        pin.setPointerCapture(e.pointerId);

        const rect     = container.getBoundingClientRect();
        const pinRect  = pin.getBoundingClientRect();

        // Current left/top in % relative to container
        origLeft = ((pinRect.left + pinRect.width / 2 - rect.left) / rect.width) * 100;
        origTop  = ((pinRect.top  - rect.top) / rect.height) * 100;

        startX = e.clientX;
        startY = e.clientY;
    };

    const onPointerMove = e => {
        if (!isDragging || !_editMode) return;
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const dx   = ((e.clientX - startX) / rect.width)  * 100;
        const dy   = ((e.clientY - startY) / rect.height) * 100;

        const newLeft = Math.max(2, Math.min(98, origLeft + dx));
        const newTop  = Math.max(2, Math.min(90, origTop  + dy));

        pin.style.left      = `${newLeft.toFixed(2)}%`;
        pin.style.top       = `${newTop.toFixed(2)}%`;
        pin.style.transform = 'translateX(-50%)';
    };

    const onPointerUp = e => {
        if (!isDragging) return;
        isDragging = false;
        pin.classList.remove('hub-pin--dragging');
    };

    pin.addEventListener('pointerdown', onPointerDown);
    pin.addEventListener('pointermove', onPointerMove);
    pin.addEventListener('pointerup',   onPointerUp);
    pin.addEventListener('pointercancel', onPointerUp);

    // Store cleanup so we can remove listeners later
    _dragCleanup.set(pin, () => {
        pin.removeEventListener('click',        blockNav, true);
        pin.removeEventListener('pointerdown',  onPointerDown);
        pin.removeEventListener('pointermove',  onPointerMove);
        pin.removeEventListener('pointerup',    onPointerUp);
        pin.removeEventListener('pointercancel', onPointerUp);
    });
}

function removePinDrag(pin) {
    _dragCleanup.get(pin)?.();
    _dragCleanup.delete(pin);
    pin.classList.remove('hub-pin--dragging');
}

// ============================================================
//   HUB TOAST — small feedback message inside the hub view
// ============================================================
function showHubToast(hubViewEl, message) {
    let toast = hubViewEl.querySelector('.hub-edit-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'hub-edit-toast';
        hubViewEl.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('hub-edit-toast--visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('hub-edit-toast--visible'), 2200);
}

// ============================================================
//   INJECT edit/save/reset buttons into each hub view
// ============================================================
function injectEditControls(hubViewEl) {
    // Avoid duplicates
    if (hubViewEl.querySelector('.hub-edit-btn')) return;

    const editBtn = document.createElement('button');
    editBtn.className  = 'hub-edit-btn';
    editBtn.innerHTML  = '⚙ Editar Pins';
    editBtn.title      = 'Arrastar ícones para reposicionar';
    editBtn.addEventListener('click', e => {
        e.stopPropagation();
        enterEditMode(hubViewEl);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'hub-save-btn hidden';
    saveBtn.innerHTML = '💾 Salvar';
    saveBtn.addEventListener('click', e => {
        e.stopPropagation();
        exitEditMode(hubViewEl);
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'hub-reset-btn hidden';
    resetBtn.innerHTML = '↩ Reset';
    resetBtn.title     = 'Restaurar posições originais';
    resetBtn.addEventListener('click', e => {
        e.stopPropagation();
        resetHubPins(hubViewEl);
    });

    hubViewEl.appendChild(editBtn);
    hubViewEl.appendChild(saveBtn);
    hubViewEl.appendChild(resetBtn);
}

// ============================================================
//   PUBLIC API
// ============================================================

/**
 * Call once after app boots.
 * Injects edit controls into every .hub-view and restores saved positions.
 */
export function initHubPins() {
    // Inject controls into every hub view
    document.querySelectorAll('.hub-view').forEach(hubViewEl => {
        injectEditControls(hubViewEl);
    });

    // Restore persisted pin positions
    applyStoredPositions();
}
