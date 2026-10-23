import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Skeleton } from '../skeleton/skeleton';

export type StatCardAccent = 'cyan' | 'teal' | 'blue' | 'danger' | 'success' | 'violet';

@Component({
  selector: 'app-stat-card',
  imports: [CommonModule, MatIconModule, MatTooltipModule, Skeleton],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() icon = 'insights';
  @Input() accent: StatCardAccent = 'cyan';
  @Input() variacion: number | null = null;
  @Input() loading = false;
}
