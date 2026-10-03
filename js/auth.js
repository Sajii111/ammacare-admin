// js/auth.js — Firebase Auth only. Signed in == admin.
import { auth } from './fb.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export const authState = {
  user:    null,   // Firebase Auth user or null
  ready:   false   // true once the first onAuthStateChanged fires
};

// Anyone who can sign in with Firebase Auth is an admin.
// Admins are created/removed in Firebase Console → Authentication → Users.
export const isAdmin = () => Boolean(authState.user);

let resolveReady;
const readyPromise = new Promise(r => { resolveReady = r; });

onAuthStateChanged(auth, user => {
  authState.user = user;
  authState.ready = true;
  resolveReady();
  window.dispatchEvent(new CustomEvent('authchange'));
});

export const whenReady = () => readyPromise;

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signOutNow() {
  await fbSignOut(auth);
}