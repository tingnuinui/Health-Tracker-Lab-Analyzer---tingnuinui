import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "gen-lang-client-0014422363",
  appId: "1:978227936883:web:946402bf6886970bc77406",
  apiKey: "AIzaSyAJLNrYkuTt16qs034UlkEBJrMvlrNCnA4",
  authDomain: "gen-lang-client-0014422363.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-29f335c3-c8ac-451f-97d7-9c310736d1d9",
  storageBucket: "gen-lang-client-0014422363.firebasestorage.app",
  messagingSenderId: "978227936883",
  measurementId: ""
};

// Initialize Firebase App in Read-Only client mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore for the specified central database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
