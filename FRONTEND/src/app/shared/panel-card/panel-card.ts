import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-panel-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './panel-card.html',
  styleUrl: './panel-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelCard {
  @Input({ required: true }) titulo!: string;
  @Input() icon?: string;
  @Input() loading = false;
}
