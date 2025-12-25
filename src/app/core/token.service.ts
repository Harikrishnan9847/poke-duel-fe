import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly KEY = 'access_token';
  private readonly REFRESH = 'refresh_token';

  set(token: string, refreshToken: string) {
    localStorage.setItem(this.KEY, token);
    localStorage.setItem(this.REFRESH, refreshToken);
  }

  get(): string | null {
    return localStorage.getItem(this.KEY);
  }

  getRefresh(): string | null {
    return localStorage.getItem(this.REFRESH);
  }

  clear() {
    localStorage.removeItem(this.KEY);
  }

  isLoggedIn(): boolean {
    return !!this.get();
  }
}
