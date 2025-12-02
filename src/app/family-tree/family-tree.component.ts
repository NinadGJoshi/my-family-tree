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
import { ContentService } from '../content.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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

  // translations observable + shortcut object for template
  contentPage$!: Observable<any>;
  t: any = {};

  // localized action labels (Add Parent / Add Sibling / Add Child)
  addParentLabel: string = 'Add Parent';
  addSiblingLabel: string = 'Add Sibling';
  addChildLabel: string = 'Add Child';

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

  // relationTypes will be localized in setLocalizedLabels()
  relationTypes: Array<{ label: string; value: string }> = [];

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
    private renderer: Renderer2,
    private contentService: ContentService
  ) {
    window.addEventListener('online', () => this.syncPendingChanges());
  }

  ngOnInit(): void {
    // Load translations (non-blocking); when translations arrive, set localized labels.
    this.contentPage$ = this.contentService.getTranslations().pipe(
      tap(translations => {
        this.t = translations || {};
        this.setLocalizedLabels();
      })
    );

    // existing initialization logic (unchanged)
    const treeData = this.route.snapshot.data['treeData'];
    this.data = treeData ? treeData : this.getDefaultTree();
    localStorage.setItem('familyTree', JSON.stringify(this.data));
    this.listenForRemoteUpdates();
    window.addEventListener('resize', () => {
      this.isDesktop = window.innerWidth > 768;
    });
  }

  /**
   * Populate localized labels for relation types and add-* actions.
   * Uses translation keys if present, otherwise falls back to sensible defaults.
   */
  private setLocalizedLabels(isRootNode: boolean = false): void {
    const tr = this.t || {};

    // Relation option labels (for the selectButton)
    const parentLabel = tr['mft_parent'] || 'Parent';
    const siblingLabel = tr['mft_sibling'] || 'Sibling';
    const childLabel = tr['mft_child'] || 'Child';

    this.relationTypes = isRootNode ? [
      { label: parentLabel, value: 'parent' },
      { label: childLabel, value: 'child' }
    ] : [
      { label: parentLabel, value: 'parent' },
      { label: siblingLabel, value: 'sibling' },
      { label: childLabel, value: 'child' }
    ];

    // Add action labels: prefer dedicated mft_add_* keys if available
    this.addParentLabel = tr['mft_add_parent'] || `Add ${parentLabel}`;
    this.addSiblingLabel = tr['mft_add_sibling'] || `Add ${siblingLabel}`;
    this.addChildLabel = tr['mft_add_child'] || `Add ${childLabel}`;
  }

  getDefaultTree(): OrganizationChartNode[] {
    return [
      {
        label: 'Root Person',
        type: 'person',
        styleClass: 'p-person',
        expanded: true,
        isRootNode: true,
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

    if (this.selectedNode) {
      const isRootNode: boolean = this.selectedNode.isRootNode;
      this.setLocalizedLabels(isRootNode);
    }
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
    updated.dob = updated.dob ? this.convertToYYYYMMDD(updated.dob) : null;
    updated.diedOn = updated.isAlive ? null : (updated.diedOn ? this.convertToYYYYMMDD(updated.diedOn) : null);
    updated.partnerDob = updated.partnerDob ? this.convertToYYYYMMDD(updated.partnerDob) : null;
    updated.partnerDiedOn = updated.partnerIsAlive ? null : (updated.partnerDiedOn ? this.convertToYYYYMMDD(updated.partnerDiedOn) : null);

    this.selectedNode.label = updated.name ? updated.name : undefined;
    this.selectedNode.data = updated;

    localStorage.setItem('familyTree', JSON.stringify(this.data));
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
      isRootNode: false,
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
        this.selectedNode.isRootNode = false;
        break;
      case 'parent':
        const index = this.data.indexOf(this.selectedNode);
        if (index > -1) this.data.splice(index, 1);
        newNode.children = [this.selectedNode];
        this.selectedNode.isRootNode = false;
        newNode.isRootNode = true;
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

    // Use translated confirmation strings if available, fallback to English
    const confirmMessage = this.t && this.t['mft_delete_node']
      ? `${this.t['mft_delete_node']} ${node.label}?`
      : `Are you sure you want to delete ${node.label}?`;

    const confirmHeader = this.t && this.t['mft_delete'] ? this.t['mft_delete'] : 'Delete Confirmation';

    this.confirmationService.confirm({
      message: confirmMessage,
      header: confirmHeader,
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
    // Use translation keys where possible; fallback to English phrases
    const nameLabel = this.t?.mft_name ? `${this.t.mft_name}: ` : '';
    const dobLabel = this.t?.mft_dob ? `${this.t.mft_dob}: ` : 'DOB: ';
    const statusLabel = this.t?.mft_is_alive ? `${this.t.mft_is_alive}: ` : 'Status: ';
    const diedOnLabel = this.t?.mft_died_on ? `${this.t.mft_died_on}: ` : 'Died On: ';
    const marriedLabel = this.t?.mft_married ? `${this.t.mft_married}: ` : 'Married: ';
    const partnerLabel = this.t?.mft_partner ? `${this.t.mft_partner}: ` : 'Partner: ';
    const partnerDobLabel = this.t?.mft_partner_dob ? `${this.t.mft_partner_dob}: ` : 'Partner DOB: ';
    const partnerStatusLabel = this.t?.mft_partner_alive ? `${this.t.mft_partner_alive}: ` : 'Partner Status: ';

    return `
      <div>
        <div><b>${data.name}</b></div>
        <div>${dobLabel}${data.dob || '-'}</div>
        <div>${statusLabel}${data.isAlive ? (this.t?.mft_alive ?? 'Alive') : (this.t?.mft_dead ?? 'Deceased')}</div>
        ${!data.isAlive && data.diedOn ? `<div>${diedOnLabel}${data.diedOn}</div>` : ''}
        <div>${marriedLabel}${data.married === 'Y' ? (this.t?.mft_yes ?? 'Yes') : (this.t?.mft_no ?? 'No')}</div>
        ${data.married === 'Y' ? `
          <div><b>${partnerLabel}</b> ${data.partnerName || '-'}</div>
          <div>${partnerDobLabel}${data.partnerDob || '-'}</div>
          <div>${partnerStatusLabel}${data.partnerIsAlive ? (this.t?.mft_alive ?? 'Alive') : (this.t?.mft_dead ?? 'Deceased')}</div>
          ${!data.partnerIsAlive && data.partnerDiedOn ? `<div>${diedOnLabel}${data.partnerDiedOn}</div>` : ''}
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

  private convertToYYYYMMDD(dateInput: string | Date): string {
    if (!dateInput) {
      return '';
    }
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.error("Invalid Date input provided:", dateInput);
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


}
