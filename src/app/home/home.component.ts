import { Component, ChangeDetectionStrategy, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { fromEvent, Subject } from 'rxjs';
import { startWith, takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';
import { UserService } from '../core/user.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private userService = inject(UserService);

  private readonly destroy$ = new Subject<void>();

  // menu open state
  readonly menuOpen = signal(false);

  // exposes whether current user is admin (defensive: subscribe if auth provides observable)
  readonly isAdmin = signal(false);

  readonly userName = signal<string | null>(null);

  // show/hide homepage-only content (about section)
  readonly showHomeContent = signal<boolean>(false);

  constructor() {
    // set initial visibility based on current URL
    this.showHomeContent.set(this.router.url === '/' || this.router.url === '');

    // update on navigation end events
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe((ev) => {
        const url = ev.urlAfterRedirects ?? ev.url ?? '';
        this.showHomeContent.set(url === '/' || url === '');
      });

    this.userService
    .me()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
        next: (user) => {
            console.log('HomeComponent: fetched user', user);
            const isAdminFlag = user.scope === 'Admin';
            this.isAdmin.set(isAdminFlag);
            this.userName.set(user.email ?? null);
        },
        error: () => {
            this.isAdmin.set(false);
            this.userName.set(null);
        }
    });

    // try to pick up admin flag and user name from AuthService if available
    const maybeIsAdmin$ = (this.auth as any).isAdmin$;
    if (maybeIsAdmin$ && typeof maybeIsAdmin$.subscribe === 'function') {
      maybeIsAdmin$
        .pipe(startWith(false), takeUntil(this.destroy$))
        .subscribe((v: unknown) => this.isAdmin.set(Boolean(v)));
    }

    const maybeUser$ = (this.auth as any).user$;
    if (maybeUser$ && typeof maybeUser$.subscribe === 'function') {
      maybeUser$
        .pipe(startWith(null), takeUntil(this.destroy$))
        .subscribe((u: any) => this.userName.set(u?.name ?? null));
    }

    // close menu when clicking outside
    fromEvent<MouseEvent>(document, 'click')
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev) => {
        const target = ev.target as HTMLElement | null;
        // close the menu if click happened outside component root / menu button
        if (!target) return;
        const menuEls = document.querySelectorAll('.profile-menu, .profile-btn');
        const clickedInside = Array.from(menuEls).some(el => el.contains(target));
        if (!clickedInside) this.menuOpen.set(false);
      });

    // close menu on navigation
    (this.router.events as any)
      ?.pipe?.(takeUntil(this.destroy$))
      ?.subscribe?.(() => this.menuOpen.set(false));
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  async logout() {
    // try to call provided auth.logout(), otherwise navigate to /login
    try {
      if (typeof (this.auth as any).logout === 'function') {
        await (this.auth as any).logout();
      }
    } finally {
      this.closeMenu();
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
