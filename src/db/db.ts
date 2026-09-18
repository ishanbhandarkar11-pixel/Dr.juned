import Dexie, { type EntityTable } from 'dexie';

export interface Customer {
  id: string;
  name: string;
  startDate: string;
  defaultQuantity: number;
  rate: number;
  status: 'Active' | 'Paused';
  pauseStartDate?: string;
  pauseEndDate?: string;
  lastGeneratedDate: string;
  session?: 'Morning' | 'Evening';
  milkType?: 'Cow' | 'Buffalo';
  isActive?: boolean;
}

export interface Delivery {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  quantity: number;
  rate: number;
  amount: number;
  status: 'Delivered' | 'Skipped' | 'Custom';
  remarks?: string;
  isManual: boolean;
  session?: 'Morning' | 'Evening';
  milkType?: 'Cow' | 'Buffalo';
}

export interface Payment {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
  notes?: string;
}

const db = new Dexie('MilkManagementDB') as Dexie & {
  customers: EntityTable<Customer, 'id'>;
  deliveries: EntityTable<Delivery, 'id'>;
  payments: EntityTable<Payment, 'id'>;
};

// Version 1 (legacy schema)
db.version(1).stores({
  customers: 'id, name, isActive',
  deliveries: 'id, customerId, date, month, status, [customerId+month], [customerId+date]'
});

// Version 2 (added payments and status indexes)
db.version(2).stores({
  customers: 'id, name, status, isActive',
  deliveries: 'id, customerId, date, month, status, [customerId+month], [customerId+date]',
  payments: 'id, customerId, date, amount'
});

export { db };
