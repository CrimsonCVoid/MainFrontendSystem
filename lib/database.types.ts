/**
 * DATABASE TYPES (Supabase)
 *
 * Auto-generated TypeScript types for the PostgreSQL database schema.
 * These types match the database tables exactly.
 *
 * KY - YOU NEED TO ADD:
 * - `roof_data` JSONB column to the projects table
 * - Run: ALTER TABLE projects ADD COLUMN roof_data JSONB;
 * - After adding, regenerate these types with: npx supabase gen types typescript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      /**
       * USERS TABLE
       * Stores user profiles and Stripe subscription data
       * - id: UUID from Supabase Auth
       * - subscription_status: "active" | "past_due" | "canceled" | null
       * - stripe_customer_id: Links to Stripe customer
       */
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          subscription_status: string | null;
          subscription_id: string | null;
          subscription_current_period_end: string | null;
          stripe_customer_id: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          subscription_status?: string | null;
          subscription_id?: string | null;
          subscription_current_period_end?: string | null;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          subscription_status?: string | null;
          subscription_id?: string | null;
          subscription_current_period_end?: string | null;
          stripe_customer_id?: string | null;
        };
      };
      /**
       * PROJECTS TABLE
       * Core roofing project data
       *
       * KY - KEY FIELDS:
       * - latitude/longitude: From address selection, use these to trigger your roof rendering algorithm
       * - square_footage: Populate this from your algorithm after roof generation
       * - buy_price: Material cost (contractor pays)
       * - sell_price: Customer price (must be >= buy_price, enforced by DB constraint)
       *
       * KY - MISSING COLUMN (you need to add):
       * - roof_data JSONB: Will store output from your roof rendering algorithm
       *   Expected structure: { planes: [], measurements: {}, total_area_sf: number, panel_count: number }
       *   See integration comments in components/dashboard/RoofViewer3D.tsx for details
       */
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          address: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          latitude: number | null; // KY: Input for roof algorithm
          longitude: number | null; // KY: Input for roof algorithm
          google_place_id: string | null;
          square_footage: number | null; // KY: Populate this from roof algorithm output
          payment_required: boolean | null;
          payment_completed: boolean | null;
          payment_id: string | null;
          buy_price: number | null; // Contractor material cost
          sell_price: number | null; // Customer-facing price
          // MISSING: roof_data JSONB | null - ADD THIS COLUMN
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          address?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          google_place_id?: string | null;
          square_footage?: number | null;
          payment_required?: boolean | null;
          payment_completed?: boolean | null;
          payment_id?: string | null;
          buy_price?: number | null;
          sell_price?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          address?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          google_place_id?: string | null;
          square_footage?: number | null;
          payment_required?: boolean | null;
          payment_completed?: boolean | null;
          payment_id?: string | null;
          buy_price?: number | null;
          sell_price?: number | null;
        };
      };
      /**
       * PAYMENTS TABLE
       * Tracks Stripe payments for projects
       * - payment_type: "subscription" | "project"
       * - status: "pending" | "succeeded" | "failed"
       * - square_footage: Stored at time of payment for pricing tier calculation
       */
      payments: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          amount: number;
          currency: string | null;
          status: string;
          payment_type: string;
          square_footage: number | null;
          stripe_payment_intent_id: string | null;
          stripe_invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          amount: number;
          currency?: string | null;
          status: string;
          payment_type: string;
          square_footage?: number | null;
          stripe_payment_intent_id?: string | null;
          stripe_invoice_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          amount?: number;
          currency?: string | null;
          status?: string;
          payment_type?: string;
          square_footage?: number | null;
          stripe_payment_intent_id?: string | null;
          stripe_invoice_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
