// Hand-written until `supabase gen types typescript --linked` can run
// against a deployed project. Mirrors `supabase/migrations/0001_init.sql`.
// Keep these two files in lockstep.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          email: string | null;
          name: string | null;
          bean_balance: number;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          email?: string | null;
          name?: string | null;
          bean_balance?: number;
          stripe_customer_id?: string | null;
        };
        Update: {
          phone?: string | null;
          email?: string | null;
          name?: string | null;
          bean_balance?: number;
          stripe_customer_id?: string | null;
        };
      };
      cafes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          hours_json: Record<string, [string, string]>;
          square_location_id: string | null;
          square_access_token_enc: string | null;
          stripe_account_id: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['cafes']['Row']> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database['public']['Tables']['cafes']['Row']>;
      };
      catalog_items: {
        Row: {
          id: string;
          cafe_id: string;
          square_object_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          category: string | null;
          is_available: boolean;
          image_url: string | null;
          sort: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['catalog_items']['Row']> & {
          cafe_id: string;
          square_object_id: string;
          name: string;
          price_cents: number;
        };
        Update: Partial<Database['public']['Tables']['catalog_items']['Row']>;
      };
      catalog_modifiers: {
        Row: {
          id: string;
          cafe_id: string;
          square_object_id: string;
          parent_item_id: string | null;
          modifier_list_id: string | null;
          name: string;
          price_delta_cents: number;
          selection_type: 'single' | 'multiple';
          sort: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['catalog_modifiers']['Row']> & {
          cafe_id: string;
          square_object_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['catalog_modifiers']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          cafe_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal_cents: number;
          tip_cents: number;
          beans_redeemed: number;
          beans_value_cents: number;
          total_charged_cents: number;
          app_fee_cents: number;
          stripe_payment_intent_id: string | null;
          square_order_id: string | null;
          pickup_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & {
          user_id: string;
          cafe_id: string;
          subtotal_cents: number;
          total_charged_cents: number;
        };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          catalog_item_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_price_cents: number;
          modifiers_json: Array<{
            catalog_object_id: string;
            name: string;
            price_delta_cents: number;
          }>;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['order_items']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
      };
      loyalty_ledger: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          delta: number;
          reason: Database['public']['Enums']['ledger_reason'];
          idempotency_key: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['loyalty_ledger']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['loyalty_ledger']['Row']>;
      };
      reimbursements: {
        Row: {
          id: string;
          cafe_id: string;
          period_start: string;
          period_end: string;
          beans_value_cents: number;
          stripe_transfer_id: string | null;
          status: Database['public']['Enums']['reimbursement_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reimbursements']['Row']> & {
          cafe_id: string;
          period_start: string;
          period_end: string;
          beans_value_cents: number;
        };
        Update: Partial<Database['public']['Tables']['reimbursements']['Row']>;
      };
      webhook_events: {
        Row: {
          id: string;
          source: 'stripe' | 'square';
          event_id: string;
          payload: unknown;
          processed_at: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          source: 'stripe' | 'square';
          event_id: string;
          payload: unknown;
        };
        Update: { processed_at?: string | null; error?: string | null };
      };
      push_tokens: {
        Row: {
          user_id: string;
          expo_token: string;
          platform: 'ios' | 'android';
          updated_at: string;
        };
        Insert: { user_id: string; expo_token: string; platform: 'ios' | 'android' };
        Update: { updated_at?: string };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      order_status:
        | 'pending'
        | 'paid'
        | 'accepted'
        | 'in_progress'
        | 'ready'
        | 'completed'
        | 'cancelled'
        | 'failed';
      ledger_reason: 'earn' | 'redeem' | 'adjust' | 'expire';
      reimbursement_status: 'pending' | 'paid' | 'failed';
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience row aliases used throughout the app.
export type Cafe = Database['public']['Tables']['cafes']['Row'];
export type CatalogItem = Database['public']['Tables']['catalog_items']['Row'];
export type CatalogModifier = Database['public']['Tables']['catalog_modifiers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type LedgerEntry = Database['public']['Tables']['loyalty_ledger']['Row'];
export type OrderStatus = Database['public']['Enums']['order_status'];
