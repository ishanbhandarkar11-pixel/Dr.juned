import { db, Delivery, Customer } from './db';
import { getTodayStr, addDays } from '../utils/dateUtils';

export async function generateDeliveriesUpToToday() {
  const today = getTodayStr(); // '2026-09-18'

  // 1. Permanent removal of any sample/dummy customers & their records
  try {
    const dummyIds = ['cust-rahul', 'cust-amit', 'cust-suresh', 'cust-pooja', 'cust-vikram', 'cust-shrikisan'];
    const dummyNames = ['shrikisan', 'rahul', 'amit', 'suresh', 'pooja', 'vikram', 'डॉक्टर'];

    const customersToDelete = await db.customers
      .filter(c => 
        dummyIds.includes(c.id) || 
        dummyNames.some(dName => c.name.toLowerCase().trim().includes(dName))
      )
      .toArray();

    for (const cust of customersToDelete) {
      await db.deliveries.where('customerId').equals(cust.id).delete();
      await db.payments.where('customerId').equals(cust.id).delete();
      await db.customers.delete(cust.id);
    }
  } catch (e) {
    console.error('Error cleaning up sample customers:', e);
  }

  // 2. Real 9 Customers specified by the user
  const userRealClients: Customer[] = [
    {
      id: 'cust-bawankule',
      name: 'बावनकुड़े',
      startDate: '2026-09-01',
      defaultQuantity: 0.5,
      rate: 45,
      status: 'Active',
      isActive: true,
      session: 'Morning',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-katre',
      name: 'katre',
      startDate: '2026-09-01',
      defaultQuantity: 0.5,
      rate: 50,
      status: 'Active',
      isActive: true,
      session: 'Morning',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-krishna',
      name: 'Krishna',
      startDate: '2026-09-01',
      defaultQuantity: 0.5,
      rate: 50,
      status: 'Active',
      isActive: true,
      session: 'Morning',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-sanju-bisen',
      name: 'संजू बिसेन',
      startDate: '2026-09-01',
      defaultQuantity: 1,
      rate: 50,
      status: 'Active',
      isActive: true,
      session: 'Morning',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-saau',
      name: 'साउ',
      startDate: '2026-09-01',
      defaultQuantity: 1,
      rate: 50,
      status: 'Active',
      isActive: true,
      session: 'Evening',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-santosh',
      name: 'संतोष',
      startDate: '2026-09-01',
      defaultQuantity: 0.5,
      rate: 45,
      status: 'Active',
      isActive: true,
      session: 'Evening',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-santosh-tenant',
      name: 'संतोष किरायेवाला',
      startDate: '2026-09-01',
      defaultQuantity: 0.5,
      rate: 45,
      status: 'Active',
      isActive: true,
      session: 'Evening',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-dhware',
      name: 'ध्वारे',
      startDate: '2026-09-01',
      defaultQuantity: 0.5,
      rate: 50,
      status: 'Active',
      isActive: true,
      session: 'Evening',
      milkType: 'Cow',
      lastGeneratedDate: today
    },
    {
      id: 'cust-sanjeev-tenant',
      name: 'संजीव बिशन का किरायेवाला',
      startDate: '2026-09-01',
      defaultQuantity: 1,
      rate: 50,
      status: 'Active',
      isActive: true,
      session: 'Evening',
      milkType: 'Cow',
      lastGeneratedDate: today
    }
  ];

  // 2. Insert initial customers ONLY if they do not exist yet (never overwrite user's pause/rate settings)
  for (const client of userRealClients) {
    const existing = await db.customers.get(client.id);
    if (!existing) {
      await db.customers.put(client);
    }
  }

  // 3. Clean up ALL duplicate deliveries and normalize ID to `${customerId}_${date}`
  const allCurrentDeliveries = await db.deliveries.toArray();
  const validCustomers = await db.customers.toArray();
  const validCustomerIds = new Set(validCustomers.map(c => c.id));

  const seenDatePerCustomer = new Map<string, Delivery>();
  const duplicateIdsToDelete: string[] = [];

  for (const del of allCurrentDeliveries) {
    // Delete orphan records if customer does not exist
    if (!validCustomerIds.has(del.customerId)) {
      duplicateIdsToDelete.push(del.id);
      continue;
    }

    const key = `${del.customerId}_${del.date}`;
    const expectedId = `${del.customerId}_${del.date}`;

    if (seenDatePerCustomer.has(key)) {
      // It's a duplicate entry for the same date and customer!
      duplicateIdsToDelete.push(del.id);
    } else {
      seenDatePerCustomer.set(key, del);
      // If the delivery has an arbitrary random ID instead of the deterministic expectedId,
      // queue the old ID for deletion so we can store it properly with expectedId
      if (del.id !== expectedId) {
        duplicateIdsToDelete.push(del.id);
      }
    }
  }

  if (duplicateIdsToDelete.length > 0) {
    await db.deliveries.bulkDelete(duplicateIdsToDelete);
  }

  // 4. Generate clean deliveries from 1st Sept 2026 to today (inclusive)
  const customers = await db.customers.toArray();
  const deliveriesToSave: Delivery[] = [];

  for (const customer of customers) {
    // Auto-resume if pause date has passed
    if (customer.status === 'Paused' && customer.pauseEndDate && today > customer.pauseEndDate) {
      await db.customers.update(customer.id, {
        status: 'Active',
        isActive: true,
        pauseStartDate: undefined,
        pauseEndDate: undefined
      });
      customer.status = 'Active';
    }

    let current = customer.startDate || '2026-09-01';

    while (current <= today) {
      const key = `${customer.id}_${current}`;
      const existing = seenDatePerCustomer.get(key);

      const isPausedForDate = customer.status === 'Paused' &&
        customer.pauseStartDate && customer.pauseEndDate &&
        current >= customer.pauseStartDate && current <= customer.pauseEndDate;

      if (isPausedForDate) {
        deliveriesToSave.push({
          id: key,
          customerId: customer.id,
          date: current,
          month: current.substring(0, 7),
          quantity: 0,
          rate: customer.rate,
          amount: 0,
          remarks: 'Paused',
          status: 'Skipped',
          isManual: false,
          session: customer.session || 'Morning',
          milkType: customer.milkType || 'Cow'
        });
      } else if (existing) {
        // Retain user's custom changes if they already edited (like skipped or changed qty)
        deliveriesToSave.push({
          ...existing,
          id: key, // Ensure deterministic primary key
          customerId: customer.id,
          date: current,
          month: current.substring(0, 7),
          session: customer.session || 'Morning',
          milkType: customer.milkType || 'Cow'
        });
      } else {
        // Create fresh standard delivered record
        deliveriesToSave.push({
          id: key,
          customerId: customer.id,
          date: current,
          month: current.substring(0, 7),
          quantity: customer.defaultQuantity,
          rate: customer.rate,
          amount: customer.defaultQuantity * customer.rate,
          remarks: 'Normal',
          status: 'Delivered',
          isManual: false,
          session: customer.session || 'Morning',
          milkType: customer.milkType || 'Cow'
        });
      }

      current = addDays(current, 1);
    }
  }

  if (deliveriesToSave.length > 0) {
    await db.deliveries.bulkPut(deliveriesToSave);
  }
}
