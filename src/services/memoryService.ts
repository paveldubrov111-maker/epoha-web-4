import { supabase } from '../supabaseClient';

export interface MemoryEntry {
  id?: string;
  user_id: string;
  content: string;
  type: 'fact' | 'preference' | 'summary' | 'activity';
  created_at?: string;
}

export const memoryService = {
  async saveMemory(entry: MemoryEntry) {
    const { data, error } = await supabase
      .from('ai_memory')
      .upsert({
        ...entry,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Error saving memory to Supabase:', error);
      return null;
    }
    return data?.[0];
  },

  async getMemories(userId: string) {
    const { data, error } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching memory from Supabase:', error);
      return [];
    }
    return data as MemoryEntry[];
  },

  async deleteMemory(id: string) {
    const { error } = await supabase
      .from('ai_memory')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting memory from Supabase:', error);
      return false;
    }
    return true;
  },

  async trackActivity(userId: string, action: string, details?: any) {
    const content = `Користувач ${action}: ${details ? JSON.stringify(details) : ''}`;
    return this.saveMemory({
      user_id: userId,
      content,
      type: 'activity'
    });
  }
};
