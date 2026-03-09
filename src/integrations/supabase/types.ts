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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_attributions: {
        Row: {
          affiliate_link_id: string
          converted_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string | null
          session_id: string | null
        }
        Insert: {
          affiliate_link_id: string
          converted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
        }
        Update: {
          affiliate_link_id?: string
          converted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_attributions_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          click_count: number
          code: string
          created_at: string
          id: string
          product_id: string | null
        }
        Insert: {
          affiliate_id: string
          click_count?: number
          code: string
          created_at?: string
          id?: string
          product_id?: string | null
        }
        Update: {
          affiliate_id?: string
          click_count?: number
          code?: string
          created_at?: string
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_programs: {
        Row: {
          attribution_model: string
          auto_approve: boolean
          cookie_duration_days: number
          created_at: string
          default_commission_percent: number
          hold_days: number
          id: string
          is_enabled: boolean
          min_payout_amount: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attribution_model?: string
          auto_approve?: boolean
          cookie_duration_days?: number
          created_at?: string
          default_commission_percent?: number
          hold_days?: number
          id?: string
          is_enabled?: boolean
          min_payout_amount?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attribution_model?: string
          auto_approve?: boolean
          cookie_duration_days?: number
          created_at?: string
          default_commission_percent?: number
          hold_days?: number
          id?: string
          is_enabled?: boolean
          min_payout_amount?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_programs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          application_note: string | null
          approved_at: string | null
          bank_account: Json | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          pix_key: string | null
          status: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          application_note?: string | null
          approved_at?: string | null
          bank_account?: Json | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          pix_key?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          application_note?: string | null
          approved_at?: string | null
          bank_account?: Json | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          pix_key?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          page_path: string | null
          product_id: string | null
          referrer: string | null
          storefront_id: string | null
          user_agent: string | null
          visitor_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          page_path?: string | null
          product_id?: string | null
          referrer?: string | null
          storefront_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          page_path?: string | null
          product_id?: string | null
          referrer?: string | null
          storefront_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_line_items: {
        Row: {
          checkout_session_id: string
          created_at: string
          id: string
          is_order_bump: boolean
          price_id: string
          product_id: string
          quantity: number
          unit_amount: number
        }
        Insert: {
          checkout_session_id: string
          created_at?: string
          id?: string
          is_order_bump?: boolean
          price_id: string
          product_id: string
          quantity?: number
          unit_amount?: number
        }
        Update: {
          checkout_session_id?: string
          created_at?: string
          id?: string
          is_order_bump?: boolean
          price_id?: string
          product_id?: string
          quantity?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "checkout_line_items_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_line_items_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          abandoned_at: string | null
          affiliate_link_id: string | null
          completed_at: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_amount: number
          email: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          status: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string
        }
        Insert: {
          abandoned_at?: string | null
          affiliate_link_id?: string | null
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_amount?: number
          email?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id: string
        }
        Update: {
          abandoned_at?: string | null
          affiliate_link_id?: string | null
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_amount?: number
          email?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          created_at: string
          fixed_amount: number | null
          id: string
          is_active: boolean
          percent: number
          product_id: string
        }
        Insert: {
          created_at?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          percent?: number
          product_id: string
        }
        Update: {
          created_at?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          percent?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          approved_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          hold_until: string | null
          id: string
          order_id: string
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          approved_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          hold_until?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          approved_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          hold_until?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_assets: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number
          created_at: string
          evidence: Json | null
          gateway_dispute_id: string | null
          id: string
          order_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          evidence?: Json | null
          gateway_dispute_id?: string | null
          id?: string
          order_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          evidence?: Json | null
          gateway_dispute_id?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email: string
          event_type: string
          id: string
          lead_id: string | null
          message_id: string | null
          metadata: Json | null
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email: string
          event_type: string
          id?: string
          lead_id?: string | null
          message_id?: string | null
          metadata?: Json | null
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          message_id?: string | null
          metadata?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_segments: {
        Row: {
          created_at: string | null
          description: string | null
          filter_rules: Json | null
          id: string
          member_count: number | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          filter_rules?: Json | null
          id?: string
          member_count?: number | null
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          filter_rules?: Json | null
          id?: string
          member_count?: number | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          customer_id: string
          expires_at: string | null
          granted_at: string
          id: string
          order_id: string
          product_id: string
          revoked_at: string | null
        }
        Insert: {
          customer_id: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          order_id: string
          product_id: string
          revoked_at?: string | null
        }
        Update: {
          customer_id?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          order_id?: string
          product_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_accounts: {
        Row: {
          created_at: string
          credentials_enc: Json | null
          id: string
          is_active: boolean
          is_primary: boolean
          provider: string
          recipient_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          credentials_enc?: Json | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          provider?: string
          recipient_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          credentials_enc?: Json | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          provider?: string
          recipient_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_segment_members: {
        Row: {
          added_at: string | null
          lead_id: string
          segment_id: string
        }
        Insert: {
          added_at?: string | null
          lead_id: string
          segment_id: string
        }
        Update: {
          added_at?: string | null
          lead_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_segment_members_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "email_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string
          id: string
          metadata: Json | null
          name: string | null
          opt_in_at: string | null
          opt_in_ip: string | null
          phone: string | null
          product_id: string | null
          source: string | null
          source_detail: string | null
          status: string
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name?: string | null
          opt_in_at?: string | null
          opt_in_ip?: string | null
          phone?: string | null
          product_id?: string | null
          source?: string | null
          source_detail?: string | null
          status?: string
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          opt_in_at?: string | null
          opt_in_ip?: string | null
          phone?: string | null
          product_id?: string | null
          source?: string | null
          source_detail?: string | null
          status?: string
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          customer_id: string
          id: string
          last_accessed_at: string | null
          member_content_id: string
          progress_percent: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_accessed_at?: string | null
          member_content_id: string
          progress_percent?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_accessed_at?: string | null
          member_content_id?: string
          progress_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_member_content_id_fkey"
            columns: ["member_content_id"]
            isOneToOne: false
            referencedRelation: "member_content"
            referencedColumns: ["id"]
          },
        ]
      }
      member_content: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_free: boolean | null
          is_published: boolean | null
          media_type: string | null
          media_url: string | null
          parent_id: string | null
          position: number | null
          product_id: string
          text_content: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          parent_id?: string | null
          position?: number | null
          product_id: string
          text_content?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          parent_id?: string | null
          position?: number | null
          product_id?: string
          text_content?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_member_content_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "member_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_member_content_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bumps: {
        Row: {
          bump_product_id: string
          created_at: string
          description: string | null
          headline: string | null
          id: string
          is_active: boolean
          main_product_id: string
          position: number
        }
        Insert: {
          bump_product_id: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          main_product_id: string
          position?: number
        }
        Update: {
          bump_product_id?: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          main_product_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_main_product_id_fkey"
            columns: ["main_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          is_order_bump: boolean
          is_upsell: boolean
          order_id: string
          price_id: string
          product_id: string
          quantity: number
          total_amount: number
          unit_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_order_bump?: boolean
          is_upsell?: boolean
          order_id: string
          price_id: string
          product_id: string
          quantity?: number
          total_amount?: number
          unit_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_order_bump?: boolean
          is_upsell?: boolean
          order_id?: string
          price_id?: string
          product_id?: string
          quantity?: number
          total_amount?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_link_id: string | null
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_avatar_url: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          discount_amount: number | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          payment_method: string | null
          product_id: string | null
          source: string | null
          status: string
          subtotal_amount: number | null
          total_amount: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          affiliate_link_id?: string | null
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          customer_avatar_url?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          source?: string | null
          status?: string
          subtotal_amount?: number | null
          total_amount?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          affiliate_link_id?: string | null
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          customer_avatar_url?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          source?: string | null
          status?: string
          subtotal_amount?: number | null
          total_amount?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failed_at: string | null
          failure_reason: string | null
          gateway_account_id: string | null
          gateway_fee: number | null
          gateway_payment_id: string | null
          id: string
          idempotency_key: string | null
          installments: number
          metadata: Json | null
          method: string
          net_amount: number | null
          order_id: string
          processed_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          gateway_account_id?: string | null
          gateway_fee?: number | null
          gateway_payment_id?: string | null
          id?: string
          idempotency_key?: string | null
          installments?: number
          metadata?: Json | null
          method: string
          net_amount?: number | null
          order_id: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          gateway_account_id?: string | null
          gateway_fee?: number | null
          gateway_payment_id?: string | null
          id?: string
          idempotency_key?: string | null
          installments?: number
          metadata?: Json | null
          method?: string
          net_amount?: number | null
          order_id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_gateway_account_id_fkey"
            columns: ["gateway_account_id"]
            isOneToOne: false
            referencedRelation: "gateway_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_items: {
        Row: {
          affiliate_id: string
          amount: number
          commission_id: string
          created_at: string
          id: string
          payout_id: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          commission_id: string
          created_at?: string
          id?: string
          payout_id: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_id?: string
          created_at?: string
          id?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: true
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          method: string | null
          processed_at: string | null
          status: string
          total_amount: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          method?: string | null
          processed_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          method?: string | null
          processed_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payment_data: {
        Row: {
          copy_paste_code: string | null
          created_at: string
          expires_at: string | null
          id: string
          paid_at: string | null
          payment_id: string
          qr_code: string | null
          qr_code_url: string | null
          tx_id: string | null
        }
        Insert: {
          copy_paste_code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          payment_id: string
          qr_code?: string | null
          qr_code_url?: string | null
          tx_id?: string | null
        }
        Update: {
          copy_paste_code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          payment_id?: string
          qr_code?: string | null
          qr_code_url?: string | null
          tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_payment_data_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          amount: number
          compare_at_amount: number | null
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_installments: number | null
          name: string | null
          pix_discount_percent: number | null
          product_id: string
          type: Database["public"]["Enums"]["price_type"] | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          compare_at_amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_installments?: number | null
          name?: string | null
          pix_discount_percent?: number | null
          product_id: string
          type?: Database["public"]["Enums"]["price_type"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          compare_at_amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_installments?: number | null
          name?: string | null
          pix_discount_percent?: number | null
          product_id?: string
          type?: Database["public"]["Enums"]["price_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          mime_type: string | null
          position: number | null
          product_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          position?: number | null
          product_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          position?: number | null
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_storefront_visible: boolean | null
          name: string
          sales_count: number | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"] | null
          stock_limit: number | null
          storefront_order: number | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_storefront_visible?: boolean | null
          name: string
          sales_count?: number | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_limit?: number | null
          storefront_order?: number | null
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_storefront_visible?: boolean | null
          name?: string
          sales_count?: number | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_limit?: number | null
          storefront_order?: number | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          gateway_refund_id: string | null
          id: string
          order_id: string
          payment_id: string
          processed_at: string | null
          reason: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          gateway_refund_id?: string | null
          id?: string
          order_id: string
          payment_id: string
          processed_at?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_refund_id?: string | null
          id?: string
          order_id?: string
          payment_id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_blocks: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_visible: boolean
          position: number
          storefront_id: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          storefront_id: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          storefront_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_blocks_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_themes: {
        Row: {
          background_color: string | null
          button_style: string | null
          created_at: string | null
          custom_css: string | null
          font_body: string | null
          font_heading: string | null
          id: string
          primary_color: string | null
          secondary_color: string | null
          storefront_id: string
          template_key: string | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          button_style?: string | null
          created_at?: string | null
          custom_css?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          storefront_id: string
          template_key?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          button_style?: string | null
          created_at?: string | null
          custom_css?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          storefront_id?: string
          template_key?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_themes_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefronts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          slug: string
          social_links: Json | null
          title: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          social_links?: Json | null
          title?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          social_links?: Json | null
          title?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefronts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_offers: {
        Row: {
          created_at: string
          description: string | null
          headline: string | null
          id: string
          is_active: boolean
          position: number
          special_price: number
          trigger_product_id: string
          type: string
          upsell_product_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          position?: number
          special_price?: number
          trigger_product_id: string
          type?: string
          upsell_product_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          position?: number
          special_price?: number
          trigger_product_id?: string
          type?: string
          upsell_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsell_offers_trigger_product_id_fkey"
            columns: ["trigger_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_offers_upsell_product_id_fkey"
            columns: ["upsell_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          event_type: string
          external_event_id: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          status: string
          workspace_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          external_event_id?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider: string
          status?: string
          workspace_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_slug: { Args: { base_name: string }; Returns: string }
    }
    Enums: {
      price_type: "ONE_TIME" | "RECURRING"
      product_status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      product_type:
        | "DIGITAL_PRODUCT"
        | "LEAD_MAGNET"
        | "LINK"
        | "COACHING_CALL"
        | "ECOURSE"
        | "MEMBERSHIP"
      workspace_role: "OWNER" | "ADMIN" | "MEMBER"
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
      price_type: ["ONE_TIME", "RECURRING"],
      product_status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      product_type: [
        "DIGITAL_PRODUCT",
        "LEAD_MAGNET",
        "LINK",
        "COACHING_CALL",
        "ECOURSE",
        "MEMBERSHIP",
      ],
      workspace_role: ["OWNER", "ADMIN", "MEMBER"],
    },
  },
} as const
