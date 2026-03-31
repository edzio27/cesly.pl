import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  vehicle_type: string;
  brand: string;
  model: string;
  year: number;
  mileage?: number;
  monthly_payment: number;
  buyout_price?: number;
  transfer_fee: number;
  remaining_installments: number;
  total_installments: number;
  images: string[];
  is_promoted: boolean;
  created_at: string;
  updated_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type RecentView = {
  id: string;
  user_id: string;
  listing_id: string;
  viewed_at: string;
};
