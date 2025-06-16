import { Component, OnDestroy, ViewChild } from '@angular/core';
import { FamilyTreeComponent } from "../family-tree/family-tree.component";
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, FamilyTreeComponent, FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  searchMatches: Element[] = [];
  currentMatchIndex?: number;
  constructor(private authService: AuthService, private router: Router) { }
  @ViewChild(FamilyTreeComponent) familyTreeComponent!: FamilyTreeComponent;
  searchQuery: string = '';
  logout() {
    this.familyTreeComponent.syncTree();
    this.authService.logout();
    this.router.navigate(['./login']);
  }

  downloadTreeAsJson() {
    const treeData = localStorage.getItem('familyTree');
    if (!treeData) {
      console.error('error in downloading the tree data');
      return;
    }

    const blob = new Blob([treeData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (!Array.isArray(json)) throw new Error();

        // Load into UI
        this.familyTreeComponent.loadTreeFromJson(json);

        // Save to Firebase
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          await this.authService.saveTreeData(userId, json);
        } else {
          console.error('Could not sync to Firebase.');
        }
      } catch (error) {
        console.error('error occurred during upload', error);
      }
    };

    reader.readAsText(file);
  }

  searchNode() {
    if (!this.searchQuery.trim()) return;

    const matches = this.familyTreeComponent.findMatchingNodes(this.searchQuery.trim());

    if (!matches || matches.length === 0) {
      this.searchMatches = [];
      return;
    }

    this.searchMatches = matches;
    this.currentMatchIndex = 0;
    this.scrollToMatch(this.currentMatchIndex ? this.currentMatchIndex : 0);
  }


  scrollToMatch(index: number) {
    const element: Element = this.searchMatches[this.currentMatchIndex ? this.currentMatchIndex : 0];
    this.familyTreeComponent.scrollToNode(element);
  }

  nextMatch() {
    if (this.searchMatches.length > 1) {
      this.currentMatchIndex =
        (this.currentMatchIndex ? this.currentMatchIndex : 0 + 1) % this.searchMatches.length;
      this.scrollToMatch(this.currentMatchIndex);
    }
  }

  prevMatch() {
    if (this.searchMatches.length > 1) {
      this.currentMatchIndex =
        (this.currentMatchIndex ? this.currentMatchIndex : 0 - 1 + this.searchMatches.length) %
        this.searchMatches.length;
      this.scrollToMatch(this.currentMatchIndex);
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchMatches = [];
    this.currentMatchIndex = 0;
  }
}