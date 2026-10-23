import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { PanelCard } from '../panel-card/panel-card';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-chart-card',
  imports: [CommonModule, NgApexchartsModule, PanelCard, Skeleton],
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCard {
  @Input({ required: true }) titulo!: string;
  @Input({ required: true }) options!: ApexOptions;
  @Input() icon?: string;
  @Input() loading = false;
}
