import { formatCurrency } from '../../../../core/currency.service';
import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MovimientoGlobal } from '../../../../core/models';

export interface MovimientoDetailDialogData {
  movimiento: MovimientoGlobal;
}

@Component({
  selector: 'app-movimiento-detail-dialog',
  imports: [CommonModule, DatePipe, MatButtonModule, MatChipsModule, MatDialogModule],
  templateUrl: './movimiento-detail-dialog.html',
  styleUrl: './movimiento-detail-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovimientoDetailDialog {
  private readonly dialogRef = inject(MatDialogRef<MovimientoDetailDialog, void>);
  readonly money=formatCurrency;
  readonly data = inject<MovimientoDetailDialogData>(MAT_DIALOG_DATA);

  cerrar(): void {
    this.dialogRef.close();
  }
}
