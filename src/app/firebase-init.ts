// src/app/firebase-init.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; 
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore'; 

const firebaseDevConfig = require('./config/firebase-dev.config').firebaseConfig;
const firebaseProdConfig = require('./config/firebase-prod.config').firebaseConfig;

// NOTE: We wrap the process.env access in a function/check to avoid local errors
//       The build script ensures this works on CI/CD.
const isProduction = () => {
  try {
    // This check will only run if process is available (CI/CD)
    return process.env['NODE_ENV'] === 'production';
  } catch (e) {
    // If process is not defined (local ng serve), treat it as development
    return false;
  }
}

export const firebaseConfig = isProduction() ? firebaseProdConfig : firebaseDevConfig;
export const app = initializeApp(firebaseConfig); 
export const dbInstance = getDatabase(app);
export const authInstance = getAuth(app); 
export const firestoreInstance = getFirestore(app);