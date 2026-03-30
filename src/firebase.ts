import { supabase } from './supabaseClient';

export const db = 'supabase';
export const auth = supabase.auth;

export class GoogleAuthProvider {}

export function onAuthStateChanged(auth: any, callback: (user: any) => void) {
  const wrapUser = (user: any) => {
    if (!user) return null;
    return {
      ...user,
      uid: user.id,
      displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
      email: user.email
    };
  };

  // Initial check
  auth.getUser().then(({ data: { user } }: any) => {
    callback(wrapUser(user));
  });

  const { data: { subscription } } = auth.onAuthStateChange((event: string, session: any) => {
    callback(wrapUser(session?.user || null));
  });
  return () => subscription.unsubscribe();
}

export async function signInWithPopup(auth: any, provider: any) {
  const { error } = await auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOut(auth: any) {
  const { error } = await auth.signOut();
  if (error) throw error;
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
  console.error('Firestore/Supabase Error: ', String(error), operationType, path);
  alert(`Помилка бази даних (${operationType}): ${String(error)}. Перевірте консоль для деталей.`);
}

// Convert camelCase object keys to snake_case for Supabase columns (SHALLOW)
function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) continue;
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// Convert snake_case Supabase columns back to camelCase object keys (SHALLOW)
function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export function collection(db: any, path: string) {
  return { path };
}

export function doc(db: any, path: string, id?: string) {
  return { path: id ? `${path}/${id}` : path };
}

function parsePath(fullPath: string) {
  const parts = fullPath.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === 'users') {
    return { table: 'profiles', userId: parts[1], id: parts[1] };
  }
  
  const userId = parts[1];
  let table = parts[2];
  const tableMap: Record<string, string> = {
    accounts: 'accounts',
    categories: 'categories',
    budgetTxs: 'budget_txs',
    investmentTxs: 'investment_txs',
    portfolios: 'portfolios',
    portfolioAssets: 'portfolio_assets',
    assets: 'assets',
    bbAllocations: 'bb_allocations',
    monthlyPlans: 'monthly_plans',
    bankConnections: 'bank_connections',
    goals: 'goals',
    cushion: 'cushion',
    debts: 'debts',
    portfolioTransactions: 'portfolio_transactions'
  };
  table = tableMap[table] || table;
  let id = null;
  if (parts.length > 3) {
      id = parts.slice(3).join('/');
  }
  
  return { table, userId, id };
}

export function onSnapshot(ref: { path: string }, callback: (snapshot: any) => void, onError?: (err: any) => void) {
  const { table, userId, id } = parsePath(ref.path);
  let channel: any;

  if (id) {
    const idField = table === 'profiles' ? 'id' : 'id';
    supabase.from(table).select('*').eq(idField, id).single().then(({ data, error }) => {
      if (error && error.code !== 'PGRST116' && onError) onError(error);
      if (data) {
        callback({ exists: () => true, id: data[idField], data: () => toCamelCase(data) });
      } else {
        callback({ exists: () => false, data: () => undefined });
      }
    });

    channel = supabase.channel(`public:${table}:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `${idField}=eq.${id}` }, (payload) => {
        if (payload.eventType === 'DELETE') {
          callback({ exists: () => false, data: () => undefined });
        } else {
          callback({ exists: () => true, id: payload.new[idField], data: () => toCamelCase(payload.new) });
        }
      })
      .subscribe();
      
  } else {
    // Initial fetch
    supabase.from(table).select('*').eq('user_id', userId).then(({ data, error }) => {
      if (error && onError) onError(error);
      if (data) {
        callback({ docs: data.map((d: any) => ({ id: d.id, data: () => toCamelCase(d) })) });
      }
    });

    channel = supabase.channel(`collection:${table}:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `user_id=eq.${userId}` }, async () => {
        const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
        if (error) console.error(`[ON_SNAPSHOT] Error re-fetching ${table}:`, error);
        if (data) {
          callback({ docs: data.map((d: any) => ({ id: d.id, data: () => toCamelCase(d) })) });
        }
      })
      .subscribe();
  }

  return () => supabase.removeChannel(channel);
}

export async function setDoc(ref: { path: string }, data: any, options?: { merge?: boolean }) {
  const { table, userId, id } = parsePath(ref.path);
  const snakeData = toSnakeCase(data);
  const payload = { ...snakeData };
  if (table !== 'profiles') {
    payload.user_id = userId;
  }
  
  if (id) {
    const idField = table === 'profiles' ? 'id' : 'id';
    payload.id = table === 'profiles' ? userId : id;

    const { error: upsertError } = await supabase.from(table).upsert(payload);
    if (upsertError) {
      console.error(`Error upserting doc in ${table}`, upsertError);
      throw upsertError;
    }
  } else {
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      console.error(`Error setting doc in ${table}`, error);
      throw error;
    }
  }
}

export async function deleteDoc(ref: { path: string }) {
  const { table, id } = parsePath(ref.path);
  const idField = table === 'profiles' ? 'id' : 'id';
  if (id) {
    const { error } = await supabase.from(table).delete().eq(idField, id);
    if (error) {
      console.error(`Error deleting doc from ${table}`, error);
      throw error;
    }
  }
}

export async function getDoc(ref: { path: string }) {
  const { table, id } = parsePath(ref.path);
  const idField = table === 'profiles' ? 'id' : 'id';
  
  const { data, error } = await supabase.from(table).select('*').eq(idField, id).single();
  if (error && error.code !== 'PGRST116') throw error;
  
  return {
    exists: () => !!data,
    id: data?.[idField],
    data: () => data ? toCamelCase(data) : undefined
  };
}

export const getDocFromServer = getDoc;

export function writeBatch(db: any) {
  const setsByTable: Record<string, any[]> = {};
  const deletes: Promise<any>[] = [];

  return {
    set(ref: { path: string }, data: any, options?: { merge?: boolean }) {
      const { table, userId, id } = parsePath(ref.path);
      const idField = table === 'profiles' ? 'id' : 'id';
      if (!setsByTable[table]) setsByTable[table] = [];
      
      const payload: any = { [idField]: id, ...toSnakeCase(data) };
      if (table !== 'profiles' && userId) {
        payload.user_id = userId;
      }
      
      const existingIdx = setsByTable[table].findIndex(item => item[idField] === id);
      if (existingIdx >= 0) {
        setsByTable[table][existingIdx] = { ...setsByTable[table][existingIdx], ...payload };
      } else {
        setsByTable[table].push(payload);
      }
    },
    update(ref: { path: string }, data: any) {
      this.set(ref, data);
    },
    delete(ref: { path: string }) {
      deletes.push(deleteDoc(ref));
    },
    async commit() {
      for (const table of Object.keys(setsByTable)) {
        const payload = setsByTable[table];
        if (payload.length > 0) {
          console.log(`[writeBatch] Upserting ${payload.length} records to ${table}`);
          const { error } = await supabase.from(table).upsert(payload);
          if (error) {
            console.error(`[writeBatch] Error in batch upsert for ${table}:`, error);
            throw error;
          }
        }
      }
      if (deletes.length > 0) {
        await Promise.all(deletes);
      }
    }
  };
}
