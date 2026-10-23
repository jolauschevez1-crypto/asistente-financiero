import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Usuario } from '../../../../core/models';

export interface ResetPasswordDialogData {
  usuario: Usuario;
}

function passwordsCoincidenValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmar = group.get('confirmar')?.value;
  return password === confirmar ? null : { passwordsNoCoinciden: true };
}

@Component({
  selector: 'app-reset-password-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './reset-password-dialog.html',
  styleUrl: './reset-password-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordDialog {
  private readonly dialogRef = inject(MatDialogRef<ResetPasswordDialog, string>);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordsCoincidenValidator },
  );

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue().password);
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
