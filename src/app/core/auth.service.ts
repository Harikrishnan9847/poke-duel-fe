import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { tap } from 'rxjs/operators';

interface AuthResponse { 
    access_token: string;
    refresh_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(
    private api: ApiService,
    private tokenService: TokenService
  ) {}

  login(userEmail: string, password: string) {
    return this.api.post<AuthResponse>('/auth/token', { userEmail, password })
      .pipe(tap(({ access_token, refresh_token }) => {this.tokenService.set(access_token, refresh_token);}));
  }

  logout() {
    this.tokenService.clear();
  }

  refreshToken() {
    return this.api.post<any>('/auth/refresh', {
      refreshToken: this.tokenService.getRefresh()
    });
  }
}
