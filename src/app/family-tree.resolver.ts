import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { dbInstance } from './firebase-init'; 

import { ref, get, set } from 'firebase/database';

import { Gender, OrganizationChartNode, Relation } from './models/family-tree.model';
import { UniqueIdService } from './unique-id.service';

@Injectable({ providedIn: 'root' })
export class FamilyTreeResolver implements Resolve<OrganizationChartNode[]> {
  private db = dbInstance; // Use the initialized DB instance

  constructor(private uniqueIdService: UniqueIdService) {}

  async resolve(): Promise<OrganizationChartNode[]> {

    const user = JSON.parse(sessionStorage.getItem('firebaseUser') || '{}');
    const userId = user?.uid;

    if (!userId) return [];
    const treeRef = ref(this.db, `trees/${userId}`);
    const snapshot = await get(treeRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      const initialTree: OrganizationChartNode[] = [
        {
          label: 'Root Person',
          type: 'person',
          styleClass: 'p-person',
          isRootNode: true,
          expanded: true,
          data: {
            nodeId: this.uniqueIdService.generateSixDigitId(),
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
