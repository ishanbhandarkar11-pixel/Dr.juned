export type { Customer, Delivery, Payment } from './db/db';

export interface DailySummaryStats {
  todayMilk: number;
  todayAmount: number;
  todayChangesCount: number;
  monthSales: number;
  totalPending: number;
}
