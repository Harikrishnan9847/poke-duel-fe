import { Component, ChangeDetectionStrategy, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly email = computed(() => this.form.get('email') as FormControl);
  readonly password = computed(() => this.form.get('password') as FormControl);

  // replace toSignal: a signal updated from statusChanges
  readonly formValid = signal(this.form.valid);

  // computed now depends on a signal and will update correctly
  readonly canSubmit = computed(() => this.formValid() && !this.isSubmitting());

  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.form.statusChanges
      .pipe(startWith(this.form.status), takeUntil(this.destroy$))
      .subscribe(status => this.formValid.set(status === 'VALID'));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    this.auth.login(this.form.value.email as string, this.form.value.password as string).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.error.set('Invalid email or password');
        this.focusFirstInvalid();
      }
    });
  }

  private focusFirstInvalid() {
    const invalid = document.querySelector<HTMLInputElement>('input.ng-invalid');
    if (invalid) invalid.focus();
  }
}
