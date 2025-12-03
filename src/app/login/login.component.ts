import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { SelectButtonChangeEvent, SelectButtonModule } from 'primeng/selectbutton';
import { ContentService } from '../content.service';
import { Observable, of } from 'rxjs';
import { take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [CommonModule, FormsModule, ButtonModule, SelectButtonModule],
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  isSignupMode = false;
  forgotEmail = '';
  showForgot = false;
  error = '';

  langOptions: any[] = [
    {
      label: 'English',
      value: 'en'
    },
    {
      label: 'हिन्दी',
      value: 'hn'
    },
    {
      label: 'मराठी',
      value: 'mr'
    }
  ];
  selectedLangCode!: string;
  loginPageContent$: Observable<any> | undefined;
  currentTranslations: any = {};

  constructor(private authService: AuthService, private router: Router, private contentService: ContentService) { }

  ngOnInit(): void {
    this.selectedLangCode = this.contentService.selectedLangCode;
    this.loginPageContent$ = this.contentService.getTranslations().pipe(
      tap(translations => {
        this.currentTranslations = translations;
      })
    );
  }

  toggleMode() {
    this.isSignupMode = !this.isSignupMode;
  }

  loginOrSignup() {
    this.error = '';  // Reset any previous error messages

    if (this.isSignupMode) {
      // Firebase signup logic
      this.authService.signup(this.email, this.password)
        .then(() => {
          this.isSignupMode = false;
          this.email = '';  // Clear email and password fields
          this.password = '';
          this.forgotEmail = '';  // Clear forgot email
        })
        .catch(error => {
          // Display a user-friendly error message
          this.error = this.getErrorMessage(error.code);
        });
    } else {
      // Firebase login logic
      this.authService.login(this.email, this.password)
        .then(user => {
          this.router.navigate(['./home']);
        })
        .catch(error => {
          // Display a user-friendly error message
          this.error = this.getErrorMessage(error.code);
        });
    }
  }

  sendResetLink() {
    this.authService.resetPassword(this.forgotEmail)
      .then(() => {
        alert('Reset link sent!');
      })
      .catch(error => {
        this.error = this.getErrorMessage(error.code);
      });
  }

  // Utility function to map error codes to user-friendly messages
  getErrorMessage(errorCode: string): string {
    const t = this.currentTranslations;
    switch (errorCode) {
      case 'auth/invalid-email':
        return t['auth_invalid_email'] || 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return t['auth_user_not_found'] || 'No user found with this email address.';
      case 'auth/wrong-password':
        return t['auth_wrong_password'] || 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return t['auth_email_already_in_use'] || 'This email is already registered. Try logging in.';
      default:
        return t['auth_unexpected_error'] || 'An unexpected error occurred. Please try again later.';
    }
  }

  getSelectedLangCode($event: SelectButtonChangeEvent) {
    if (!$event.value) return;
    this.selectedLangCode = $event.value;
    this.contentService.selectedLangCode = $event.value;
    localStorage.setItem('defaultLocale', this.selectedLangCode);
    this.contentService.getTranslations().pipe(
      tap(translations => (this.loginPageContent$ = of(translations), this.currentTranslations = translations)),
      take(1)
    ).subscribe();
  }
}
