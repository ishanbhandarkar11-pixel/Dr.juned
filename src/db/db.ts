import Dexie, { type EntityTable } from 'dexie';

export interface Customer {
  id: string;
  name: string;
  startDate: string;
  session: 'Morning' | 'Evening';
  milkType: 'Cow' | 'Buffalo';
  defaultQuantity: number;
  rate: number;
  isActive: boolean;
  lastGeneratedDate: string;
}

export interface Delivery {
  id: string;
  customerId: string;
  date: string;
  month: string;
  quantity: number;
  rate: number;
  amount: number;
  status: 'Delivered' | 'Skipped';
  isManual: boolean;
}

const db = new Dexie('MilkManagementDB') as Dexie & {
  customers: EntityTable<Customer, 'id'>;
  deliveries: EntityTable<Delivery, 'id'>;
};

db.version(1).stores({
  customers: 'id, name, isActive',
  deliveries: 'id, customerId, date, month, status, [customerId+month], [customerId+date]'
});

export { db };
