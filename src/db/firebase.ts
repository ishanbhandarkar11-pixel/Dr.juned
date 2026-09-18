import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, Customer, Delivery, Payment } from './db';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use long-polling to prevent 10-second WebChannel stream timeouts in browser/iframe sandbox
export const firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  }
})();

// Connection & sync state
export let isCloudConnected = false;
const listeners = new Set<(connected: boolean) => void>();

export function subscribeToCloudStatus(cb: (connected: boolean) => void) {
  listeners.add(cb);
  cb(isCloudConnected);
  return () => {
    listeners.delete(cb);
  };
}

function setCloudConnected(val: boolean) {
  if (isCloudConnected !== val) {
    isCloudConnected = val;
    listeners.forEach(fn => fn(val));
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  // If it's an offline/unreachable warning, mark status as offline without crashing
  if (errMsg.includes('offline') || errMsg.includes('Backend didn\'t respond')) {
    setCloudConnected(false);
  }
  const errInfo = {
    error: errMsg,
    operationType,
    path
  };
  console.warn('Firestore notice:', JSON.stringify(errInfo));
}

// 1. Connection Test to Firestore with safe timeout
export async function testConnection(timeoutMs = 4000): Promise<boolean> {
  try {
    const testRef = doc(firestore, 'test', 'connection');
    const fetchPromise = getDocFromServer(testRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Backend didn\'t respond within timeout')), timeoutMs)
    );

    await Promise.race([fetchPromise, timeoutPromise]).catch((err) => {
      // Document not found is normal and means server responded!
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'not-found') {
        return;
      }
      throw err;
    });

    setCloudConnected(true);
    console.log('✅ Firebase Firestore connected successfully!');
    return true;
  } catch (error) {
    setCloudConnected(false);
    console.warn('Firebase Firestore running in offline cache mode.');
    return false;
  }
}

// 2. Upload a single customer to Cloud
export async function uploadCustomerToCloud(customer: Customer) {
  try {
    const ref = doc(firestore, 'customers', customer.id);
    await setDoc(ref, customer, { merge: true });
    setCloudConnected(true);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `customers/${customer.id}`);
  }
}

// 3. Upload a single delivery to Cloud
export async function uploadDeliveryToCloud(delivery: Delivery) {
  try {
    const ref = doc(firestore, 'deliveries', delivery.id);
    await setDoc(ref, delivery, { merge: true });
    setCloudConnected(true);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `deliveries/${delivery.id}`);
  }
}

// 4. Upload a single payment to Cloud
export async function uploadPaymentToCloud(payment: Payment) {
  try {
    const ref = doc(firestore, 'payments', payment.id);
    await setDoc(ref, payment, { merge: true });
    setCloudConnected(true);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `payments/${payment.id}`);
  }
}

// 5. Delete customer and associated records from Cloud
export async function deleteCustomerFromCloud(customerId: string) {
  try {
    await deleteDoc(doc(firestore, 'customers', customerId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `customers/${customerId}`);
  }
}

// 6. Full Initial Two-Way Synchronization
export async function syncWithFirebase() {
  try {
    const connected = await testConnection(3000);
    if (!connected) return;

    // Check Cloud Customers
    const cloudCustSnap = await getDocs(collection(firestore, 'customers'));
    const localCusts = await db.customers.toArray();

    if (cloudCustSnap.empty && localCusts.length > 0) {
      // First time: Cloud is empty, seed Cloud with all Local data!
      console.log('☁️ Seeding Firebase Cloud with initial local dairy records...');
      
      const batch = writeBatch(firestore);
      let opCount = 0;

      for (const c of localCusts) {
        batch.set(doc(firestore, 'customers', c.id), c);
        opCount++;
      }

      const localDeliveries = await db.deliveries.toArray();
      for (const d of localDeliveries) {
        if (opCount >= 450) break; // stay within 500 batch limit
        batch.set(doc(firestore, 'deliveries', d.id), d);
        opCount++;
      }

      await batch.commit();
      console.log('✅ Local records safely backed up to Firebase Firestore!');
    } else if (!cloudCustSnap.empty) {
      // Cloud has records: Pull newer/missing records from Cloud to local Dexie
      const cloudCustomers: Customer[] = [];
      cloudCustSnap.forEach(d => cloudCustomers.push(d.data() as Customer));
      if (cloudCustomers.length > 0) {
        await db.customers.bulkPut(cloudCustomers);
      }

      const cloudDelivSnap = await getDocs(collection(firestore, 'deliveries'));
      const cloudDeliveries: Delivery[] = [];
      cloudDelivSnap.forEach(d => cloudDeliveries.push(d.data() as Delivery));
      if (cloudDeliveries.length > 0) {
        await db.deliveries.bulkPut(cloudDeliveries);
      }

      const cloudPaySnap = await getDocs(collection(firestore, 'payments'));
      const cloudPayments: Payment[] = [];
      cloudPaySnap.forEach(d => cloudPayments.push(d.data() as Payment));
      if (cloudPayments.length > 0) {
        await db.payments.bulkPut(cloudPayments);
      }
      console.log('✅ Local database updated with latest Firebase Cloud records!');
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'collections');
  }
}
