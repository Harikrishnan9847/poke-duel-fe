import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { MiniGameComponent } from './minigame/minigame.component';
import { StoreComponent } from './store/store.component';
import { DuelComponent } from './duel/duel.component';
import { SeedComponent } from './seed/seed.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'minigame', component: MiniGameComponent },
      { path: 'store', component: StoreComponent },
      { path: 'duel', component: DuelComponent },
      {
        path: 'admin',
        component: SeedComponent,
        canActivate: [AdminGuard]
      }
    ]
  }
];
