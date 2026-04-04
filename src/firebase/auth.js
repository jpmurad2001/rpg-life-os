/**
 * Shadow Slave Life OS — Authentication Layer
 * ============================================
 * Abstrai todas as operações de auth do Firebase.
 * Nenhum outro módulo importa firebase-auth diretamente.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  deleteUser,
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

import { auth } from './firebase.js';

// ============================================================
//   REGISTRO
// ============================================================

/**
 * Cria uma nova conta e atualiza o display name.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName - Nome do personagem
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function register(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  console.log('[Auth] Novo Caçador registrado:', cred.user.uid);
  return cred.user;
}

// ============================================================
//   LOGIN
// ============================================================

/**
 * Autentica com email e senha.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log('[Auth] Login bem-sucedido:', cred.user.uid);
  return cred.user;
}

// ============================================================
//   LOGOUT
// ============================================================

export async function logout() {
  await signOut(auth);
  console.log('[Auth] Sessão encerrada.');
}

// ============================================================
//   EXCLUSÃO DE CONTA
// ============================================================
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");
  await deleteUser(user);
  console.log('[Auth] Conta excluída com sucesso.');
}

// ============================================================
//   RESET DE SENHA
// ============================================================

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ============================================================
//   OBSERVER DE ESTADO
// ============================================================

/**
 * Registra um callback chamado sempre que o estado de auth muda.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Retorna o usuário autenticado atual (síncrono, pode ser null antes do observer).
 */
export function currentUser() {
  return auth.currentUser;
}
