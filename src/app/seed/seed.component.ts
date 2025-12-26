import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { take, switchMap } from 'rxjs/operators';

interface PokemonMeta {
  id: number;
  name: string;
  generationId: number;
  rarity: number | string; // server may return numeric enum or string label
  baseStatTotal: number;
}

@Component({
  selector: 'app-seed',
  imports: [CommonModule, FormsModule],
  templateUrl: './seed.component.html',
  styleUrls: ['./seed.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeedComponent {
  private api = inject(ApiService);

  // seed status controls
  readonly seeded = signal<boolean | null>(null); // null = unknown/loading
  readonly loading = signal(false);
  readonly processing = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  // pokemon meta list + paging + filters
  readonly pokemonList = signal<PokemonMeta[]>([]);
  readonly pageNo = signal(1);
  readonly pageSize = signal(20);
  readonly hasMore = signal(true);
  readonly loadingList = signal(false);

  readonly filterGeneration = signal<number | null>(null);
  readonly filterRarity = signal<number | null>(null);
  readonly filterSearch = signal<string>('');

  // rarity enum mapping (numeric enum -> label)
  readonly rarityOptions = [
    { value: 1, label: 'Common' },
    { value: 2, label: 'Rare' },
    { value: 3, label: 'Epic' },
    { value: 4, label: 'PseudoLegendary' },
    { value: 5, label: 'Legendary' },
    { value: 6, label: 'Mythical' },
    { value: 7, label: 'GMax' },
    { value: 8, label: 'Mega' }
  ];

  rarityLabel(v: any) {
    const n = Number(v);
    const item = this.rarityOptions.find(r => r.value === n);
    return item ? item.label : (v ?? '');
  }

  // editing
  readonly editingId = signal<number | null>(null);
  private originalRowCache = new Map<number, PokemonMeta>();
  readonly savingId = signal<number | null>(null);

  constructor() {
    this.checkSeedStatus();
    // initial load
    this.loadPage(true);
  }

  // ----- seed operations -----
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
          // refresh list
          this.reloadList();
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
          this.reloadList();
        },
        error: () => {
          this.processing.set(false);
          this.error.set('Delete or re-seed operation failed.');
        }
      });
  }

  // ----- list + paging -----
  private buildQuery(pageNo: number, pageSize: number) {
    const params: string[] = [];
    params.push(`pageNo=${pageNo}`);
    params.push(`pageSize=${pageSize}`);
    if (this.filterGeneration()) params.push(`generation=${this.filterGeneration()}`);
    if (this.filterRarity() != null) params.push(`rarity=${this.filterRarity()}`);
    if (this.filterSearch()) params.push(`searchTerm=${encodeURIComponent(this.filterSearch())}`);
    return params.length ? `?${params.join('&')}` : '';
  }

  loadPage(reset = false) {
    if (this.loadingList()) return;
    if (reset) {
      this.pageNo.set(1);
      this.pokemonList.set([]);
      this.hasMore.set(true);
    }

    if (!this.hasMore()) return;

    const page = this.pageNo();
    const size = this.pageSize();
    const qs = this.buildQuery(page, size);

    this.loadingList.set(true);
    this.api.get<PokemonMeta[]>(`/Admin/pokemonMeta${qs}`)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const current = this.pokemonList();
          this.pokemonList.set([...current, ...res]);
          this.hasMore.set(res.length === size);
          // increment page for next load
          this.pageNo.set(page + 1);
          this.loadingList.set(false);
        },
        error: () => {
          this.error.set('Failed to load pokemon meta');
          this.loadingList.set(false);
        }
      });
  }

  reloadList() {
    this.pageNo.set(1);
    this.pokemonList.set([]);
    this.hasMore.set(true);
    this.loadPage(true);
  }

  resetFilters() {
    this.filterSearch.set('');
    this.filterRarity.set(null);
    this.filterGeneration.set(null);
    this.pageSize.set(20);
    this.reloadList();
  }

  onScroll(container: HTMLElement) {
    const threshold = 200; // px from bottom
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
      this.loadPage(false);
    }
  }

  // ----- edit -----
  startEdit(row: PokemonMeta) {
    this.editingId.set(row.id);
    // store original so we can compare later
    this.originalRowCache.set(row.id, JSON.parse(JSON.stringify(row)));
    // create temporary editable fields on the object for UI
    (row as any)._tmpBaseStats = String(row.baseStatTotal ?? '');
    // prefer numeric rarity for editing
    const r = Number((row as any).rarity);
    (row as any)._tmpRarity = Number.isFinite(r) && r > 0 ? r : null;
    (row as any)._tmpGenerationId = String(row.generationId ?? '');
  }

  cancelEdit() {
    const id = this.editingId();
    if (id == null) return;
    const original = this.originalRowCache.get(id);
    if (original) {
      // restore in list
      this.pokemonList.set(this.pokemonList().map(r => r.id === id ? original : r));
    }
    this.originalRowCache.delete(id);
    this.editingId.set(null);
  }

  saveEdit(row: PokemonMeta) {
    const id = row.id;
    const original = this.originalRowCache.get(id);
    if (!original) return;

    // parse tmp base stats if provided, otherwise use original
    let baseStatsToSend: any = original.baseStatTotal;
    const tmp = (row as any)._tmpBaseStats;
    if (tmp !== undefined && tmp !== null && String(tmp).trim() !== '') {
      // if original was numeric total, expect a number input
      if (typeof original.baseStatTotal === 'number') {
        const n = Number(tmp);
        if (!Number.isFinite(n)) {
          this.error.set('Base stats must be a number');
          return;
        }
        baseStatsToSend = n;
      } else {
        try {
          baseStatsToSend = JSON.parse(tmp);
        } catch (e) {
          this.error.set('Invalid base stats JSON');
          return;
        }
      }
    }

    const payload = {
      id: id,
      rarity: Number((row as any)._tmpRarity ?? original.rarity),
      baseStats: baseStatsToSend,
      generationId: Number((row as any)._tmpGenerationId ?? original.generationId)
    };

    this.savingId.set(id);
    this.api.post('/Admin/pokemonMeta', payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          // update the item in the list with sent values
          this.pokemonList.set(this.pokemonList().map(r => r.id === id ? ({...r, rarity: payload.rarity, baseStats: payload.baseStats, generationId: payload.generationId}) : r));
          this.originalRowCache.delete(id);
          this.savingId.set(null);
          this.editingId.set(null);
          this.message.set('Row saved successfully');
        },
        error: () => {
          this.savingId.set(null);
          this.error.set('Failed to save changes');
        }
      });
  }

  trackById(_: number, item: PokemonMeta) {
    return item.id;
  }
}
