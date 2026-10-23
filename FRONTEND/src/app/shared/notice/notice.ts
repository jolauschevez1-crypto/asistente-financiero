import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-notice',
  imports: [CommonModule],
  templateUrl: './notice.html',
  styleUrl: './notice.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notice {
  @Input() tipo: 'success' | 'danger' = 'success';
  @Input() mensaje: string | null = null;
}
