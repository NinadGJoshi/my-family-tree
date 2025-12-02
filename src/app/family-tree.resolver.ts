import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { getDatabase, ref, get, set } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './app.firebase.config';
import { Gender, OrganizationChartNode, Relation } from './models/family-tree.model';

@Injectable({ providedIn: 'root' })
export class FamilyTreeResolver implements Resolve<OrganizationChartNode[]> {
  app = initializeApp(firebaseConfig);
  db = getDatabase(this.app);

  async resolve(): Promise<OrganizationChartNode[]> {
    const user = JSON.parse(sessionStorage.getItem('firebaseUser') || '{}');
    const userId = user?.uid;

    if (!userId) return [];

    const treeRef = ref(this.db, `trees/${userId}`);
    const snapshot = await get(treeRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      // Create initial tree data
      const initialTree: OrganizationChartNode[] = [
        {
          label: 'Root Person',
          type: 'person',
          styleClass: 'p-person',
          isRootNode: true,
          expanded: true,
          data: {
            name: 'Root Person',
            gender: Gender.Male,
            dob: (new Date().toString()),
            married: 'N',
            partnerName: '',
            isAlive: false,
            diedOn: null,
            partnerDob: null,
            partnerIsAlive: false,
            partnerDiedOn: null,
            relation: Relation.Parent
          },
          children: []
        }
      ];
      await set(treeRef, initialTree);
      return initialTree;
    }
  }
}
