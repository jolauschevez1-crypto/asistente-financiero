import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-paginator',
  imports: [CommonModule, MatPaginatorModule],
  templateUrl: './app-paginator.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPaginator {
  @Input({ required: true }) length!: number;
  @Input({ required: true }) pageSize!: number;
  @Input({ required: true }) pageIndex!: number;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Output() paginaCambiada = new EventEmitter<PageEvent>();
}
