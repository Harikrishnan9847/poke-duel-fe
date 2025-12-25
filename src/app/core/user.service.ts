import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  userId: string;
  email: string;
  scope: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  // cached user object, initially null
  private user = signal<User | null>(null);

  // prefer inject() over constructor injection
  private api = inject(ApiService);

  /**
   * Returns the cached user if available. If not, calls '/me' and sets the cache.
   */
  me(): Observable<User> {
    const cached = this.user();
    if (cached !== null) {
      return of(cached);
    }

    return this.api.get<User>('/me').pipe(
      tap(response => this.user.set(response))
    );
  }
}
