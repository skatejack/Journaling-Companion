import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single instance of the Supabase client to avoid multiple GoTrueClient instances
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);