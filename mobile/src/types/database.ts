export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cafes: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          hours_json: Json
          id: string
          lat: number | null
          lng: number | null
          name: string
          slug: string
          square_access_token_enc: string | null
          square_location_id: string | null
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          hours_json?: Json
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
          square_access_token_enc?: string | null
          square_location_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          hours_json?: Json
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
          square_access_token_enc?: string | null
          square_location_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          cafe_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price_cents: number
          sort: number
          square_object_id: string
          updated_at: string
        }
        Insert: {
          cafe_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price_cents: number
          sort?: number
          square_object_id: string
          updated_at?: string
        }
        Update: {
          cafe_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price_cents?: number
          sort?: number
          square_object_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_modifiers: {
        Row: {
          cafe_id: string
          created_at: string
          id: string
          modifier_list_id: string | null
          name: string
          parent_item_id: string | null
          price_delta_cents: number
          selection_type: string
          sort: number
          square_object_id: string
        }
        Insert: {
          cafe_id: string
          created_at?: string
          id?: string
          modifier_list_id?: string | null
          name: string
          parent_item_id?: string | null
          price_delta_cents?: number
          selection_type?: string
          sort?: number
          square_object_id: string
        }
        Update: {
          cafe_id?: string
          created_at?: string
          id?: string
          modifier_list_id?: string | null
          name?: string
          parent_item_id?: string | null
          price_delta_cents?: number
          selection_type?: string
          sort?: number
          square_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_modifiers_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_modifiers_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          idempotency_key: string
          notes: string | null
          order_id: string | null
          reason: Database["public"]["Enums"]["ledger_reason"]
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          idempotency_key: string
          notes?: string | null
          order_id?: string | null
          reason: Database["public"]["Enums"]["ledger_reason"]
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          idempotency_key?: string
          notes?: string | null
          order_id?: string | null
          reason?: Database["public"]["Enums"]["ledger_reason"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          id: string
          modifiers_json: Json
          name_snapshot: string
          order_id: string
          qty: number
          unit_price_cents: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          modifiers_json?: Json
          name_snapshot: string
          order_id: string
          qty: number
          unit_price_cents: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          modifiers_json?: Json
          name_snapshot?: string
          order_id?: string
          qty?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          app_fee_cents: number
          beans_redeemed: number
          beans_value_cents: number
          cafe_id: string
          created_at: string
          id: string
          pickup_at: string | null
          square_order_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tip_cents: number
          total_charged_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_fee_cents?: number
          beans_redeemed?: number
          beans_value_cents?: number
          cafe_id: string
          created_at?: string
          id?: string
          pickup_at?: string | null
          square_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          subtotal_cents: number
          tip_cents?: number
          total_charged_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_fee_cents?: number
          beans_redeemed?: number
          beans_value_cents?: number
          cafe_id?: string
          created_at?: string
          id?: string
          pickup_at?: string | null
          square_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tip_cents?: number
          total_charged_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bean_balance: number
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          bean_balance?: number
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          bean_balance?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          expo_token: string
          platform: Database["public"]["Enums"]["push_platform"]
          updated_at: string
          user_id: string
        }
        Insert: {
          expo_token: string
          platform: Database["public"]["Enums"]["push_platform"]
          updated_at?: string
          user_id: string
        }
        Update: {
          expo_token?: string
          platform?: Database["public"]["Enums"]["push_platform"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reimbursements: {
        Row: {
          beans_value_cents: number
          cafe_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["reimbursement_status"]
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          beans_value_cents: number
          cafe_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["reimbursement_status"]
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          beans_value_cents?: number
          cafe_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["reimbursement_status"]
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursements_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          id: string
          payload: Json
          processed_at: string | null
          source: Database["public"]["Enums"]["webhook_source"]
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          source: Database["public"]["Enums"]["webhook_source"]
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          source?: Database["public"]["Enums"]["webhook_source"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ledger_reason: "earn" | "redeem" | "adjust" | "expire"
      order_status:
        | "pending"
        | "paid"
        | "accepted"
        | "in_progress"
        | "ready"
        | "completed"
        | "cancelled"
        | "failed"
      push_platform: "ios" | "android"
      reimbursement_status: "pending" | "paid" | "failed"
      webhook_source: "stripe" | "square"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ledger_reason: ["earn", "redeem", "adjust", "expire"],
      order_status: [
        "pending",
        "paid",
        "accepted",
        "in_progress",
        "ready",
        "completed",
        "cancelled",
        "failed",
      ],
      push_platform: ["ios", "android"],
      reimbursement_status: ["pending", "paid", "failed"],
      webhook_source: ["stripe", "square"],
    },
  },
} as const


// ---------------------------------------------------------------------------
// Strict shapes for jsonb columns + convenience aliases.
//
// The generated types model `order_items.modifiers_json` as the generic
// `Json` type (because Postgres jsonb has no shape). At the app layer we
// know what we put in there, so re-export OrderItem with a stricter type.
// Keep these aliases below the generated block so re-running codegen via
// the Management API only replaces the top of the file.
// ---------------------------------------------------------------------------

export type OrderItemModifier = {
  catalog_object_id: string;
  name: string;
  price_delta_cents: number;
};

export type Cafe = Tables<'cafes'>;
export type CatalogItem = Tables<'catalog_items'>;
export type CatalogModifier = Tables<'catalog_modifiers'>;
export type Profile = Tables<'profiles'>;
export type Order = Tables<'orders'>;
export type OrderItem = Omit<Tables<'order_items'>, 'modifiers_json'> & {
  modifiers_json: OrderItemModifier[];
};
export type LedgerEntry = Tables<'loyalty_ledger'>;
export type OrderStatus = Enums<'order_status'>;
