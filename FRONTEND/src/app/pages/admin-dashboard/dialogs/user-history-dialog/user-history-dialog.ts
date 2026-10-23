import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UsuarioListado } from '../../../../core/models';

export interface UserHistoryDialogData {
  usuario: UsuarioListado;
}

@Component({
  selector: 'app-user-history-dialog',
  imports: [CommonModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './user-history-dialog.html',
  styleUrl: './user-history-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserHistoryDialog {
  private readonly dialogRef = inject(MatDialogRef<UserHistoryDialog>);
  readonly data = inject<UserHistoryDialogData>(MAT_DIALOG_DATA);

  cerrar(): void {
    this.dialogRef.close();
  }
}
