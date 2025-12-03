import { Injectable } from '@angular/core';
import { authInstance } from './firebase-init';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = authInstance;
  constructor(private firestore: Firestore) { }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password).then(userCredential => {
      sessionStorage.setItem('firebaseUser', JSON.stringify(userCredential.user));
    });
  }

  async saveTreeData(userId: string, treeData: any[]): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await setDoc(userDocRef, { tree: treeData }, { merge: true });
  }

  signup(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  resetPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  getCurrentUserId(): string | null {
    const user = JSON.parse(sessionStorage.getItem('firebaseUser') || '{}');
    return user?.uid || null;
  }

  logout() {
    sessionStorage.removeItem('firebaseUser');
    return this.auth.signOut();
  }
}