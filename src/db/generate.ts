import { db, Delivery, Customer } from './db';
import { getTodayStr, addDays } from '../utils/dateUtils';

export async function generateDeliveriesUpToToday() {
  const today = getTodayStr();
  const customers = await db.customers.toArray();
  
  const newDeliveries: Delivery[] = [];
  const customersToUpdate: Customer[] = [];

  for (const customer of customers) {
    let current = customer.lastGeneratedDate;
    if (!current || current < customer.startDate) {
      current = customer.startDate;
    } else {
      current = addDays(current, 1);
    }

    let hasUpdates = false;
    while (current <= today) {
      if (customer.isActive) {
        newDeliveries.push({
          id: crypto.randomUUID(),
          customerId: customer.id,
          date: current,
          month: current.substring(0, 7),
          quantity: customer.defaultQuantity,
          rate: customer.rate,
          amount: customer.defaultQuantity * customer.rate,
          status: 'Delivered',
          isManual: false
        });
      }
      current = addDays(current, 1);
      hasUpdates = true;
    }

    if (hasUpdates) {
      customersToUpdate.push({
        ...customer,
        lastGeneratedDate: today
      });
    }
  }

  if (newDeliveries.length > 0) {
    await db.deliveries.bulkAdd(newDeliveries);
  }
  if (customersToUpdate.length > 0) {
    await db.customers.bulkPut(customersToUpdate);
  }
}
