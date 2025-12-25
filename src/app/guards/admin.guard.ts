import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../core/user.service';
import { map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  constructor(private userService: UserService, private router: Router) {}

  canActivate() {
    return this.userService.me().pipe(
      map(user => user.scope === 'Admin'),
      tap(isAdmin => {
        if (!isAdmin) this.router.navigate(['/']);
      })
    );
  }
}
