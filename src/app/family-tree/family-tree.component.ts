import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { FamilyMemberForm, Gender, OrganizationChartNode, Relation } from '../models/family-tree.model';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute } from '@angular/router';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../app.firebase.config';

@Component({
  selector: 'family-tree',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    SelectButtonModule,
    ButtonModule,
    CalendarModule,
    RadioButtonModule,
    OrganizationChartModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './family-tree.component.html',
  styleUrls: ['./family-tree.component.scss'],
  providers: [ConfirmationService]
})
export class FamilyTreeComponent implements OnInit {
  data: OrganizationChartNode[] = [];
  selectedNode: OrganizationChartNode | null = null;
  displayDialog = false;
  isEditMode = false;
  showForm = false;
  addingRelation = 'child';
  syncing = false;
  online = navigator.onLine;

  private db = getDatabase(initializeApp(firebaseConfig));

  form: FamilyMemberForm = {
    name: '',
    gender: Gender.Male,
    dob: null,
    isAlive: true,
    diedOn: null,
    married: 'N',
    partnerName: '',
    partnerDob: null,
    partnerIsAlive: true,
    partnerDiedOn: null,
    relation: Relation.Child
  };

  relationTypes = [
    { label: 'Parent', value: 'parent' },
    { label: 'Sibling', value: 'sibling' },
    { label: 'Child', value: 'child' }
  ];

  genders = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' }
  ];

  highlightedNode?: Element | null;
  tooltipDialogVisible = false;
  tooltipData: any = null;
  isDesktop = window.innerWidth > 768;

  constructor(
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private renderer: Renderer2
  ) {
    window.addEventListener('online', () => this.syncPendingChanges());
  }

  ngOnInit(): void {
    const treeData = this.route.snapshot.data['treeData'];
    this.data = treeData ? treeData : this.getDefaultTree();
    localStorage.setItem('familyTree', JSON.stringify(this.data));
    this.listenForRemoteUpdates();
    window.addEventListener('resize', () => {
      this.isDesktop = window.innerWidth > 768;
    });
  }

  getDefaultTree(): OrganizationChartNode[] {
    return [
      {
        label: 'Root Person',
        type: 'person',
        styleClass: 'p-person',
        expanded: true,
        data: {
          name: 'Root Person',
          gender: Gender.Male,
          dob: new Date().toString(),
          married: 'N',
          partnerName: '',
          isAlive: true,
          diedOn: null,
          partnerDob: null,
          partnerIsAlive: true,
          partnerDiedOn: null,
          relation: Relation.Parent
        },
        children: []
      }
    ];
  }

  listenForRemoteUpdates() {
    const user = JSON.parse(sessionStorage.getItem('firebaseUser') || '{}');
    if (!user?.uid) return;
    const treeRef = ref(this.db, `trees/${user.uid}`);
    onValue(treeRef, (snapshot) => {
      const firebaseData = snapshot.val();
      if (firebaseData) {
        const local = JSON.stringify(this.data);
        const remote = JSON.stringify(firebaseData);
        if (local !== remote) {
          this.data = firebaseData;
          localStorage.setItem('familyTree', JSON.stringify(this.data));
        }
      }
    });
  }

  onNodeClick(event: any) {
    this.selectedNode = event.node;
    const d = this.selectedNode?.data;
    if (!d) return;

    this.form = {
      name: d.name || '',
      gender: d.gender || Gender.Male,
      dob: d.dob ? new Date(d.dob) : null,
      isAlive: d.isAlive ?? true,
      diedOn: d.diedOn ? new Date(d.diedOn) : null,
      married: d.married || 'N',
      partnerName: d.partnerName || '',
      partnerDob: d.partnerDob ? new Date(d.partnerDob) : null,
      partnerIsAlive: d.partnerIsAlive ?? true,
      partnerDiedOn: d.partnerDiedOn ? new Date(d.partnerDiedOn) : null,
      relation: Relation.Child
    };

    this.displayDialog = true;
    this.isEditMode = false;
    this.showForm = false;
  }

  closeDialog() {
    this.displayDialog = false;
    this.selectedNode = null;
  }

  toggleEditForm() {
    this.showForm = !this.showForm;
    this.isEditMode = true;
  }

  isFormChanged(): boolean {
    if (!this.selectedNode) return false;

    const original = {
      ...this.selectedNode.data,
    };

    const current = {
      ...this.form
    };

    return JSON.stringify(original) !== JSON.stringify(current);
  }

  saveDetails() {
    if (!this.selectedNode) return;

    const updated = { ...this.form };

    // Convert Date objects to ISO strings or null
    updated.dob = updated.dob ? new Date(updated.dob).toISOString() : null;
    updated.diedOn = updated.isAlive ? null : (updated.diedOn ? new Date(updated.diedOn).toISOString() : null);
    updated.partnerDob = updated.partnerDob ? new Date(updated.partnerDob).toISOString() : null;
    updated.partnerDiedOn = updated.partnerIsAlive ? null : (updated.partnerDiedOn ? new Date(updated.partnerDiedOn).toISOString() : null);

    this.selectedNode.label = updated.name ? updated.name : undefined;
    this.selectedNode.data = updated;

    this.syncTree();
    this.showForm = false;
    this.isEditMode = false;
    this.closeDialog();
  }

  addFamilyMember() {
    if (!this.selectedNode || !this.form.name) return;

    const formCopy = { ...this.form };
    formCopy.dob = formCopy.dob;
    formCopy.diedOn = formCopy.isAlive ? null : formCopy.diedOn;
    formCopy.partnerDob = formCopy.partnerDob ? formCopy.partnerDob : null;
    formCopy.partnerDiedOn = formCopy.partnerIsAlive ? null : formCopy.partnerDiedOn;

    const newNode: OrganizationChartNode = {
      label: this.form.name,
      type: 'person',
      styleClass: 'p-person',
      expanded: true,
      data: formCopy,
      children: []
    };

    switch (this.addingRelation) {
      case 'child':
        this.selectedNode.children = this.selectedNode.children || [];
        this.selectedNode.children.push(newNode);
        break;
      case 'sibling':
        const parent = this.findParent(this.data, this.selectedNode);
        parent ? parent.children?.push(newNode) : this.data.push(newNode);
        break;
      case 'parent':
        const index = this.data.indexOf(this.selectedNode);
        if (index > -1) this.data.splice(index, 1);
        newNode.children = [this.selectedNode];
        this.data.push(newNode);
        break;
    }

    this.syncTree();
    this.closeDialog();
  }

  deleteNode(node: OrganizationChartNode) {
    if (!node) return;

    const totalNodes = this.getTotalNodeCount(this.data);
    if (totalNodes <= 1) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${node.label}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.animateAndDeleteNode(node);
        this.syncTree();
        this.closeDialog();
      }
    });
  }

  animateAndDeleteNode(nodeToDelete: OrganizationChartNode) {
    nodeToDelete.styleClass += ' fade-out';
    setTimeout(() => {
      this.removeNode(this.data, nodeToDelete);
    }, 500);
  }

  removeNode(nodes: OrganizationChartNode[], nodeToDelete: OrganizationChartNode): boolean {
    const index = nodes.indexOf(nodeToDelete);
    if (index > -1) {
      nodes.splice(index, 1);
      return true;
    }

    for (const node of nodes) {
      if (node.children && this.removeNode(node.children, nodeToDelete)) {
        return true;
      }
    }
    return false;
  }

  findParent(nodes: OrganizationChartNode[], child: OrganizationChartNode): OrganizationChartNode | undefined {
    for (const node of nodes) {
      if (node.children && node.children.includes(child)) return node;
      const parent = this.findParent(node.children || [], child);
      if (parent) return parent;
    }
    return undefined;
  }

  syncTree() {
    const user = JSON.parse(sessionStorage.getItem('firebaseUser') || '{}');
    if (!user?.uid) return;

    localStorage.setItem('familyTree', JSON.stringify(this.data));

    if (!navigator.onLine) {
      localStorage.setItem('pendingSync', 'true');
      return;
    }

    const serializedTree = this.serializeTreeDates(this.data);
    const treeRef = ref(this.db, `trees/${user.uid}`);
    this.syncing = true;
    set(treeRef, serializedTree).finally(() => {
      this.syncing = false;
      localStorage.removeItem('pendingSync');
    });
  }

  syncPendingChanges() {
    if (localStorage.getItem('pendingSync') === 'true') {
      this.syncTree();
    }
  }

  getTotalNodeCount(nodes: OrganizationChartNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count += 1;
      if (node.children && node.children.length) {
        count += this.getTotalNodeCount(node.children);
      }
    }
    return count;
  }

  loadTreeFromJson(data: any[]) {
    if (Array.isArray(data)) {
      this.data = data;
      localStorage.setItem('familyTree', JSON.stringify(this.data));
    } else {
      console.error('Invalid tree data format');
    }
  }

  findMatchingNodes(name: string): Element[] {
    const matches: Element[] = [];
    const elements = document.querySelectorAll('.card-node');

    for (const el of elements) {
      const label = el.textContent?.trim().toLowerCase();
      if (label && label.includes(name.toLowerCase())) {
        matches.push(el);
      }
    }

    return matches;
  }

  scrollToNode(node: Element) {
    const element = document.getElementById(node.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      this.clearHighlights();
      this.highlightedNode = node;

      this.renderer.addClass(element, 'highlight-flash');
      setTimeout(() => {
        this.renderer.removeClass(element, 'highlight-flash');
      }, 1000);
    }
  }

  clearHighlights() {
    this.highlightedNode = null;
  }

  serializeTreeDates(nodes: OrganizationChartNode[]): OrganizationChartNode[] {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        name: node.data?.name ? node.data.name : '',
        gender: node.data?.gender ? node.data.gender : null,
        dob: node.data?.dob ? node.data.dob.toString() : '',
        isAlive: !!(node.data?.isAlive),
        diedOn: node.data?.diedOn ? node.data.diedOn.toString() : '',
        Gender: node.data?.gender ? node.data?.gender : null,
        married: node.data?.married === 'Y' ? 'Y' : 'N',
        partnerName: node.data?.partnerName ? node.data.partnerName : '',
        partnerDob: node.data?.partnerDob ? node.data.partnerDob.toString() : '',
        partnerIsAlive: !!node.data?.partnerIsAlive,
        partnerDiedOn: node.data?.partnerDiedOn ? node.data.partnerDiedOn.toString() : '',
        relation: node.data?.relation ? node.data.relation : null
      },
      children: node.children ? this.serializeTreeDates(node.children) : []
    }));
  }

  getTooltipContent(data: FamilyMemberForm): string {
    return `
    <div>
      <div><b>${data.name}</b></div>
      <div>DOB: ${data.dob || '-'}</div>
      <div>Status: ${data.isAlive ? 'Alive' : 'Deceased'}</div>
      ${!data.isAlive && data.diedOn ? `<div>Died On: ${data.diedOn}</div>` : ''}
      <div>Married: ${data.married === 'Y' ? 'Yes' : 'No'}</div>
      ${data.married === 'Y' ? `
        <div><b>Partner:</b> ${data.partnerName || '-'}</div>
        <div>Partner DOB: ${data.partnerDob || '-'}</div>
        <div>Partner Status: ${data.partnerIsAlive ? 'Alive' : 'Deceased'}</div>
        ${!data.partnerIsAlive && data.partnerDiedOn ? `<div>Partner Died On: ${data.partnerDiedOn}</div>` : ''}
      ` : ''}
    </div>
  `;
  }

  onNodeTooltipClick(node: OrganizationChartNode) {
    if (this.isTouchDevice()) {
      this.tooltipData = node.data;
      this.tooltipDialogVisible = true;
    }
  }

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
