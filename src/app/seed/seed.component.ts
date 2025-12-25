import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { take, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-seed',
  imports: [CommonModule],
  templateUrl: './seed.component.html',
  styleUrls: ['./seed.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeedComponent {
  private api = inject(ApiService);

  readonly seeded = signal<boolean | null>(null); // null = unknown/loading
  readonly loading = signal(false);
  readonly processing = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.checkSeedStatus();
  }

  checkSeedStatus() {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<boolean>('/Admin/isPokemonsSeeded')
      .pipe(take(1))
      .subscribe({
        next: (v) => {
          this.seeded.set(Boolean(v));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load seed status');
          this.loading.set(false);
        }
      });
  }

  seed() {
    this.processing.set(true);
    this.message.set(null);
    this.error.set(null);

    this.api.post('/Admin/SeedPokemons', {})
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.processing.set(false);
          this.message.set('Pokémon data seeded successfully.');
          this.seeded.set(true);
        },
        error: () => {
          this.processing.set(false);
          this.error.set('Seeding failed.');
        }
      });
  }

  deleteAllAndSeed() {
    if (!confirm('Delete all Pokémon data and seed again?')) return;
    this.processing.set(true);
    this.message.set(null);
    this.error.set(null);

    this.api.post('/Admin/DeleteAllPokemons', {})
      .pipe(
        take(1),
        switchMap(() => this.api.post('/Admin/SeedPokemons', {}).pipe(take(1)))
      )
      .subscribe({
        next: () => {
          this.processing.set(false);
          this.message.set('All data deleted and re-seeded successfully.');
          this.seeded.set(true);
        },
        error: () => {
          this.processing.set(false);
          this.error.set('Delete or re-seed operation failed.');
        }
      });
  }
}
