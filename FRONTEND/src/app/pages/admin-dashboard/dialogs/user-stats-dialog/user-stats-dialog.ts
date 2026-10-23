import { formatCurrency } from '../../../../core/currency.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../../../core/api.service';
import { EstadisticasUsuario, Usuario } from '../../../../core/models';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { buildUserGastosCategoriaOptions } from '../../../../shared/chart-card/chart-builders';
import { Skeleton } from '../../../../shared/skeleton/skeleton';

export interface UserStatsDialogData {
  usuario: Usuario;
}

@Component({
  selector: 'app-user-stats-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, ChartCard, Skeleton],
  templateUrl: './user-stats-dialog.html',
  styleUrl: './user-stats-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserStatsDialog implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialogRef = inject(MatDialogRef<UserStatsDialog>);
  readonly money=formatCurrency;
  readonly data = inject<UserStatsDialogData>(MAT_DIALOG_DATA);

  readonly estadisticas = signal<EstadisticasUsuario | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly gastosCategoriaOptions = computed(() =>
    buildUserGastosCategoriaOptions(this.estadisticas()?.gastosCategoriaMes ?? []),
  );

  ngOnInit(): void {
    this.cargando.set(true);
    this.api.obtenerEstadisticasUsuario(this.data.usuario.id).subscribe({
      next: (data) => {
        this.estadisticas.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar las estadisticas.');
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
