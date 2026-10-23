import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MovimientoGlobal, MovimientoPayload } from '../../../../core/models';
import { ApiService } from '../../../../core/api.service';
import { buildCategoryOptions, CUSTOM_CATEGORY_VALUE } from '../../../../core/category-options';
import { nonBlank } from '../../../../core/input-validation';

export interface EditMovimientoGlobalDialogData {
  movimiento: MovimientoGlobal;
}

@Component({
  selector: 'app-edit-movimiento-global-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './edit-movimiento-global-dialog.html',
  styleUrl: './edit-movimiento-global-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMovimientoGlobalDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<EditMovimientoGlobalDialog, MovimientoPayload>);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly data = inject<EditMovimientoGlobalDialogData>(MAT_DIALOG_DATA);
  readonly categoriaPersonalizadaValue = CUSTOM_CATEGORY_VALUE;
  readonly catalogoCategorias = signal<string[]>([]);
  readonly avisoCategorias = signal('');
  readonly opcionesCategorias = computed(() =>
    buildCategoryOptions([this.data.movimiento.categoria, ...this.catalogoCategorias()])
  );

  readonly form = this.fb.nonNullable.group({
    categoria: [this.data.movimiento.categoria || 'Otros', [Validators.required, nonBlank, Validators.maxLength(100)]],
    categoriaPersonalizada: [''],
    monto: [Number(this.data.movimiento.monto || 0), [Validators.required, Validators.min(0.01)]],
    cuenta_origen: [this.data.movimiento.cuenta_origen || ''],
    cuenta_destino: [this.data.movimiento.cuenta_destino || ''],
    descripcion: [this.data.movimiento.descripcion || ''],
    metodo_pago: [this.data.movimiento.metodo_pago || ''],
  });

  ngOnInit(): void {
    this.api.listarCategoriasGlobal().subscribe({
      next: (categorias) => this.catalogoCategorias.set(categorias),
      error: () => this.avisoCategorias.set('No se pudo actualizar el catálogo. Se conserva la categoría actual y las opciones sugeridas.'),
    });
  }

  actualizarCategoriaPersonalizada(): void {
    const personalizada = this.form.controls.categoriaPersonalizada;
    personalizada.setValidators(this.form.controls.categoria.value === CUSTOM_CATEGORY_VALUE
      ? [Validators.required, nonBlank, Validators.maxLength(100)] : []);
    personalizada.updateValueAndValidity();
  }

  guardar(): void {
    this.actualizarCategoriaPersonalizada();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { categoriaPersonalizada, ...payload } = this.form.getRawValue();
    payload.categoria = (payload.categoria === CUSTOM_CATEGORY_VALUE ? categoriaPersonalizada : payload.categoria).trim();
    this.dialogRef.close(payload);
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
