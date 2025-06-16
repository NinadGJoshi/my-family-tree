import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [CommonModule, FormsModule, ButtonModule],
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  isSignupMode = false;
  forgotEmail = '';
  showForgot = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) { }

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
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try logging in.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }
}
