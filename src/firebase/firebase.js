/**
 * Shadow Slave Life OS — Firebase Initialization
 * ================================================
 * Importa e inicializa o Firebase SDK via CDN (ESM).
 *
 * ⚠️  CONFIGURAÇÃO NECESSÁRIA:
 *     1. Acesse https://console.firebase.google.com
 *     2. Crie um projeto (Spark plan — gratuito)
 *     3. Adicione um Web App ao projeto
 *     4. Copie o objeto `firebaseConfig` e cole abaixo.
 *     5. Ative: Authentication > Sign-in method > Email/Password
 *     6. Ative: Firestore Database (modo produção + regras do schema)
 */

import { initializeApp }             from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth }                   from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { getFirestore }              from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

// ============================================================
//   ✅ CREDENCIAIS REAIS — Firebase projeto: shadow-slave-life-os
//   Plano: Spark (gratuito)  |  Firestore: southamerica-east1
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyAgJNOvprLjiLIFf6ciKzDBU05b6ujEXB0",
  authDomain:        "shadow-slave-life-os.firebaseapp.com",
  projectId:         "shadow-slave-life-os",
  storageBucket:     "shadow-slave-life-os.firebasestorage.app",
  messagingSenderId: "479539773033",
  appId:             "1:479539773033:web:1735e7bbb2f4546f206cf8",
};
// ============================================================

let app, auth, db;

try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  console.log('[Firebase] Inicializado com sucesso. Projeto:', firebaseConfig.projectId);
} catch (e) {
  console.error('[Firebase] Falha na inicialização — verifique as credenciais em firebase.js:', e);
}

export { app, auth, db };
