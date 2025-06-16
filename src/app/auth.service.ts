import { Injectable } from '@angular/core';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { firebaseConfig } from './app.firebase.config';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor (private firestore: Firestore) {}
  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password).then(userCredential => {
      sessionStorage.setItem('firebaseUser', JSON.stringify(userCredential.user));
    });
  }

  async saveTreeData(userId: string, treeData: any[]): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await setDoc(userDocRef, { tree: treeData }, { merge: true });
  }

  signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  getCurrentUserId(): string | null {
    const user = JSON.parse(sessionStorage.getItem('firebaseUser') || '{}');
    return user?.uid || null;
  }

  logout() {
    sessionStorage.removeItem('firebaseUser');
    return auth.signOut();
  }
}