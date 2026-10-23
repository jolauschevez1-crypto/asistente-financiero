import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RolUsuario, Usuario } from '../../../../core/models';

export interface EditUserDialogData {
  usuario: Usuario;
}

export interface EditUserDialogResult {
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

@Component({
  selector: 'app-edit-user-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './edit-user-dialog.html',
  styleUrl: './edit-user-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserDialog {
  private readonly dialogRef = inject(MatDialogRef<EditUserDialog, EditUserDialogResult>);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<EditUserDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.usuario.nombre || '', [Validators.maxLength(100)]],
    correo: [this.data.usuario.correo, [Validators.required, Validators.email]],
    rol: [this.normalizarRol(this.data.usuario.rol), [Validators.required]],
  });

  /**
   * Normaliza valores de rol legacy (ej. "USER"/"ADMIN") a las dos variantes
   * canónicas en español que ofrece el selector, para que siempre haya
   * una opción visible aunque el dato en la base sea inconsistente.
   */
  private normalizarRol(rol: RolUsuario): RolUsuario {
    return ['ADMIN', 'ADMINISTRADOR'].includes(String(rol).toUpperCase()) ? 'ADMINISTRADOR' : 'USUARIO';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
