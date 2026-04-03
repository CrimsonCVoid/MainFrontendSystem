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
          company_name: string | null;
          company_logo_url: string | null;
          company_phone: string | null;
          company_address: string | null;
          company_email: string | null;
          company_website: string | null;
          active_org_id: string | null; // Current active organization for org switching
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
          company_name?: string | null;
          company_logo_url?: string | null;
          company_phone?: string | null;
          company_address?: string | null;
          company_email?: string | null;
          company_website?: string | null;
          active_org_id?: string | null;
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
          company_name?: string | null;
          company_logo_url?: string | null;
          company_phone?: string | null;
          company_address?: string | null;
          company_email?: string | null;
          company_website?: string | null;
          active_org_id?: string | null;
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
          roof_data: Json | null; // JSONB: Roof geometry, measurements, panel data
          status: string | null; // "draft" | "in_progress" | "completed" | "archived"
          organization_id: string | null; // Organization this project belongs to
          archived_at: string | null; // Timestamp when project was archived
          archived_by: string | null; // User ID who archived the project
<<<<<<< HEAD
=======
          client_id: string | null; // Link to clients table
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
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
          roof_data?: Json | null;
          status?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
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
          roof_data?: Json | null;
          status?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
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
          organization_id: string | null; // Organization this payment belongs to
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
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
          organization_id?: string | null;
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
      /**
       * PROMO_KEYS TABLE
       * Promotional keys for free project unlocks
       * - key_code: 20-character alphanumeric key
       * - is_used: Boolean flag (TRUE when all credits exhausted)
       * - credits_total: Total number of project credits this key provides
       * - credits_remaining: Number of credits still available
       * - used_by_user_id: FK to users (nullable, set on first redemption)
       * - used_for_project_id: FK to projects (nullable, set on first redemption)
       * - metadata: JSONB for additional tracking data
       */
      promo_keys: {
        Row: {
          id: string;
          key_code: string;
          is_used: boolean;
          credits_total: number;
          credits_remaining: number;
          used_by_user_id: string | null;
          used_for_project_id: string | null;
          used_at: string | null;
          created_at: string;
          created_by: string | null;
          metadata: Json | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          key_code: string;
          is_used?: boolean;
          credits_total?: number;
          credits_remaining?: number;
          used_by_user_id?: string | null;
          used_for_project_id?: string | null;
          used_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          metadata?: Json | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          key_code?: string;
          is_used?: boolean;
          credits_total?: number;
          credits_remaining?: number;
          used_by_user_id?: string | null;
          used_for_project_id?: string | null;
          used_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          metadata?: Json | null;
          notes?: string | null;
        };
      };
      /**
       * PROJECT_ESTIMATES TABLE
       * Multiple estimate variations per project
       * - name: Descriptive name for the estimate (e.g., "Option A - Premium")
       * - materials_cost: Cost of materials
       * - labor_cost: Cost of labor
       * - permits_fees: Permits and fees
       * - contingency: Contingency amount
       * - notes: Additional notes for the estimate
       */
      project_estimates: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string | null;
          materials_cost: number | null;
          labor_cost: number | null;
          permits_fees: number | null;
          contingency: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null; // Organization this estimate belongs to
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          organization_id?: string | null;
          name?: string | null;
          materials_cost?: number | null;
          labor_cost?: number | null;
          permits_fees?: number | null;
          contingency?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          organization_id?: string | null;
          name?: string | null;
          materials_cost?: number | null;
          labor_cost?: number | null;
          permits_fees?: number | null;
          contingency?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * ORGANIZATIONS TABLE
       * Multi-tenant organization system
       * - slug: URL-safe unique identifier
       * - plan: "free" | "trial" | "paid" | "enterprise"
       * - billing_status: "inactive" | "active" | "past_due" | "canceled"
       * - sf_pool_total: Total square footage purchased for this org
       * - sf_pool_used: Square footage consumed by projects
       */
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          plan: string;
          billing_status: string;
          billing_owner_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          trial_ends_at: string | null;
          settings: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          // SF Pool fields
          sf_pool_total: number;
          sf_pool_used: number;
          sf_pool_updated_at: string | null;
<<<<<<< HEAD
=======
          // Promo credits (free projects from promo codes)
          promo_project_credits: number;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          plan?: string;
          billing_status?: string;
          billing_owner_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_ends_at?: string | null;
          settings?: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          sf_pool_total?: number;
          sf_pool_used?: number;
          sf_pool_updated_at?: string | null;
<<<<<<< HEAD
=======
          promo_project_credits?: number;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          plan?: string;
          billing_status?: string;
          billing_owner_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_ends_at?: string | null;
          settings?: Json;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          sf_pool_total?: number;
          sf_pool_used?: number;
          sf_pool_updated_at?: string | null;
<<<<<<< HEAD
=======
          promo_project_credits?: number;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        };
      };
      /**
       * ORGANIZATION_MEMBERS TABLE
       * Join table with roles for org membership
       * - role: "owner" | "admin" | "member" | "viewer"
       */
      organization_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: string;
          invited_by: string | null;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: string;
          invited_by?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: string;
          invited_by?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
      };
      /**
       * ORG_INVITES TABLE
       * Organization invitations with expiration and usage tracking
       * - role: "admin" | "member" | "viewer" (not owner)
       * - invite_type: "email" | "link" | "domain"
       */
      org_invites: {
        Row: {
          id: string;
          org_id: string;
          email: string | null;
          token: string;
          role: string;
          invite_type: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          max_uses: number;
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email?: string | null;
          token: string;
          role?: string;
          invite_type?: string;
          invited_by: string;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          max_uses?: number;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string | null;
          token?: string;
          role?: string;
          invite_type?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          max_uses?: number;
          use_count?: number;
          created_at?: string;
        };
      };
      /**
       * ORG_DOMAIN_RULES TABLE
       * Domain auto-join rules for organizations
       * - domain: e.g., "company.com"
       * - default_role: Role assigned when joining via domain
       */
      org_domain_rules: {
        Row: {
          id: string;
          org_id: string;
          domain: string;
          default_role: string;
          enabled: boolean;
          verified_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          domain: string;
          default_role?: string;
          enabled?: boolean;
          verified_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          domain?: string;
          default_role?: string;
          enabled?: boolean;
          verified_at?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      /**
       * SF_POOL_TRANSACTIONS TABLE
       * Audit trail for SF pool purchases and usage
       * - transaction_type: "purchase" | "usage" | "refund" | "adjustment"
       * - sf_amount: Positive for purchase/refund, negative for usage
       */
      sf_pool_transactions: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          project_id: string | null;
          transaction_type: string;
          sf_amount: number;
          sf_balance_after: number;
          price_cents: number | null;
          stripe_payment_id: string | null;
          stripe_session_id: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          project_id?: string | null;
          transaction_type: string;
          sf_amount: number;
          sf_balance_after: number;
          price_cents?: number | null;
          stripe_payment_id?: string | null;
          stripe_session_id?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          project_id?: string | null;
          transaction_type?: string;
          sf_amount?: number;
          sf_balance_after?: number;
          price_cents?: number | null;
          stripe_payment_id?: string | null;
          stripe_session_id?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      /**
       * ESTIMATE_SHARES TABLE
       * Shareable estimate links for client portal
       */
      estimate_shares: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string | null;
          share_token: string;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          expires_at: string | null;
          password_hash: string | null;
          view_count: number;
          last_viewed_at: string | null;
          status: string;
          approved_at: string | null;
          rejected_at: string | null;
          signature_data: Json | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          organization_id?: string | null;
          share_token: string;
          client_name?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          expires_at?: string | null;
          password_hash?: string | null;
          view_count?: number;
          last_viewed_at?: string | null;
          status?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          signature_data?: Json | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          organization_id?: string | null;
          share_token?: string;
          client_name?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          expires_at?: string | null;
          password_hash?: string | null;
          view_count?: number;
          last_viewed_at?: string | null;
          status?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          signature_data?: Json | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * PROJECT_REVENUE TABLE
       * Revenue and profitability tracking per project
       */
      project_revenue: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string | null;
          estimated_revenue: number | null;
          actual_revenue: number | null;
          estimated_cost: number | null;
          actual_cost: number | null;
          margin_percent: number | null;
          payment_status: string;
          invoice_number: string | null;
          invoice_sent_at: string | null;
          paid_at: string | null;
          notes: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          organization_id?: string | null;
          estimated_revenue?: number | null;
          actual_revenue?: number | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          margin_percent?: number | null;
          payment_status?: string;
          invoice_number?: string | null;
          invoice_sent_at?: string | null;
          paid_at?: string | null;
          notes?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          organization_id?: string | null;
          estimated_revenue?: number | null;
          actual_revenue?: number | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          margin_percent?: number | null;
          payment_status?: string;
          invoice_number?: string | null;
          invoice_sent_at?: string | null;
          paid_at?: string | null;
          notes?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
      /**
       * MATERIAL_COSTS TABLE
       * Organization-specific material pricing
       */
      material_costs: {
        Row: {
          id: string;
          organization_id: string;
          material_type: string;
          material_name: string;
          sku: string | null;
          unit: string;
          cost_per_unit: number;
          supplier: string | null;
          supplier_sku: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          material_type: string;
          material_name: string;
          sku?: string | null;
          unit: string;
          cost_per_unit: number;
          supplier?: string | null;
          supplier_sku?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          material_type?: string;
          material_name?: string;
          sku?: string | null;
          unit?: string;
          cost_per_unit?: number;
          supplier?: string | null;
          supplier_sku?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * PROJECT_BOM TABLE
       * Bill of Materials for each project
       */
      project_bom: {
        Row: {
          id: string;
          project_id: string;
          material_cost_id: string | null;
          material_type: string;
          material_name: string;
          quantity: number;
          unit: string;
          unit_cost: number | null;
          total_cost: number | null;
          is_auto_calculated: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          material_cost_id?: string | null;
          material_type: string;
          material_name: string;
          quantity: number;
          unit: string;
          unit_cost?: number | null;
          total_cost?: number | null;
          is_auto_calculated?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          material_cost_id?: string | null;
          material_type?: string;
          material_name?: string;
          quantity?: number;
          unit?: string;
          unit_cost?: number | null;
          total_cost?: number | null;
          is_auto_calculated?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * EMAIL_QUEUE TABLE
       * Queue for outgoing emails
       */
      email_queue: {
        Row: {
          id: string;
          organization_id: string | null;
          to_email: string;
          to_name: string | null;
          subject: string;
          template_type: string;
          template_data: Json;
          attachment_url: string | null;
          attachment_name: string | null;
          status: string;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          scheduled_for: string;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          to_email: string;
          to_name?: string | null;
          subject: string;
          template_type: string;
          template_data: Json;
          attachment_url?: string | null;
          attachment_name?: string | null;
          status?: string;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          to_email?: string;
          to_name?: string | null;
          subject?: string;
          template_type?: string;
          template_data?: Json;
          attachment_url?: string | null;
          attachment_name?: string | null;
          status?: string;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          created_at?: string;
        };
      };
      /**
       * NOTIFICATION_PREFERENCES TABLE
       * User notification settings
       */
      notification_preferences: {
        Row: {
          user_id: string;
          email_estimate_approved: boolean;
          email_estimate_rejected: boolean;
          email_estimate_viewed: boolean;
          email_estimate_question: boolean;
          email_sf_pool_low: boolean;
          sf_pool_warning_threshold: number;
          email_team_activity: boolean;
          email_new_member_joined: boolean;
          email_project_assigned: boolean;
          email_project_archived: boolean;
          digest_frequency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email_estimate_approved?: boolean;
          email_estimate_rejected?: boolean;
          email_estimate_viewed?: boolean;
          email_estimate_question?: boolean;
          email_sf_pool_low?: boolean;
          sf_pool_warning_threshold?: number;
          email_team_activity?: boolean;
          email_new_member_joined?: boolean;
          email_project_assigned?: boolean;
          email_project_archived?: boolean;
          digest_frequency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email_estimate_approved?: boolean;
          email_estimate_rejected?: boolean;
          email_estimate_viewed?: boolean;
          email_estimate_question?: boolean;
          email_sf_pool_low?: boolean;
          sf_pool_warning_threshold?: number;
          email_team_activity?: boolean;
          email_new_member_joined?: boolean;
          email_project_assigned?: boolean;
          email_project_archived?: boolean;
          digest_frequency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      deduct_sf_from_pool: {
        Args: {
          p_org_id: string;
          p_user_id: string;
          p_project_id: string;
          p_sf_amount: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      add_sf_to_pool: {
        Args: {
          p_org_id: string;
          p_user_id: string;
          p_sf_amount: number;
          p_price_cents: number;
          p_stripe_session_id?: string | null;
          p_stripe_payment_id?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      refund_sf_to_pool: {
        Args: {
          p_org_id: string;
          p_user_id: string;
          p_project_id: string;
          p_sf_amount: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      /** Create a new organization with the current user as owner */
      create_organization: {
        Args: {
          p_user_id: string;
          p_name: string;
          p_slug: string;
          p_logo_url?: string | null;
        };
        Returns: Json;
      };
      /** Validate an invite token without accepting it */
      validate_invite_token: {
        Args: {
          p_token: string;
        };
        Returns: Json;
      };
      /** Accept an invite token and join the organization */
      accept_invite_token: {
        Args: {
          p_token: string;
        };
        Returns: Json;
      };
      /** Check if user has access to view promo keys for an org */
      check_promo_key_access: {
        Args: {
          p_org_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      /** Generate promo keys for an organization */
      generate_promo_keys_for_org: {
        Args: {
          p_org_id: string;
          p_user_id: string;
          p_count: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * ROOF_DATA JSONB STRUCTURE
 *
 * Expected structure for projects.roof_data field:
 * {
 *   planes: Array<{
 *     id: string;
 *     vertices: number[][]; // Array of [x, y, z] coordinates
 *     area_sf: number;
 *     slope: number; // Slope in degrees
 *     panel_count: number;
 *   }>;
 *   measurements: {
 *     ridge_length_ft: number;
 *     eave_length_ft: number;
 *     valley_length_ft: number;
 *     hip_length_ft: number;
 *     total_perimeter_ft: number;
 *   };
 *   total_area_sf: number;
 *   panel_count: number;
 *   panel_type: string; // "standing-seam" | "5v-crimp" | "pbr-panel" | etc.
 *   seam_width: number; // In inches for standing seam panels
 *   color: string; // Hex color code
 * }
 */
export interface RoofData {
  planes: Array<{
    id: string;
    vertices: number[][];
    area_sf: number;
    slope: number;
    panel_count: number;
  }>;
  measurements: {
    ridge_length_ft: number;
    eave_length_ft: number;
    valley_length_ft: number;
    hip_length_ft: number;
    total_perimeter_ft: number;
  };
  total_area_sf: number;
  panel_count: number;
  panel_type: string;
  seam_width: number;
  color: string;
}
