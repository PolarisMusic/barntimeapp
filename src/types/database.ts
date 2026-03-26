// This file will be replaced by generated types from Supabase CLI.
// For now, provide a minimal type placeholder.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          platform_role: "platform_admin" | "staff" | "standard";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          platform_role?: "platform_admin" | "staff" | "standard";
        };
        Update: {
          email?: string;
          full_name?: string | null;
          platform_role?: "platform_admin" | "staff" | "standard";
        };
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          type: "client" | "vendor" | "venue" | "internal";
          status: "active" | "inactive" | "archived";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          type?: "client" | "vendor" | "venue" | "internal";
          status?: "active" | "inactive" | "archived";
          notes?: string | null;
        };
        Update: {
          name?: string;
          type?: "client" | "vendor" | "venue" | "internal";
          status?: "active" | "inactive" | "archived";
          notes?: string | null;
        };
      };
      account_memberships: {
        Row: {
          id: string;
          account_id: string;
          profile_id: string;
          account_role: "account_owner" | "account_manager" | "event_coordinator" | "viewer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          profile_id: string;
          account_role?: "account_owner" | "account_manager" | "event_coordinator" | "viewer";
        };
        Update: {
          account_role?: "account_owner" | "account_manager" | "event_coordinator" | "viewer";
        };
      };
      account_membership_permissions: {
        Row: {
          id: string;
          membership_id: string;
          permission_key: string;
          created_at: string;
        };
        Insert: {
          membership_id: string;
          permission_key: string;
        };
        Update: {
          permission_key?: string;
        };
      };
      account_contacts: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role_label: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          role_label?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          role_label?: string | null;
          notes?: string | null;
        };
      };
      events: {
        Row: {
          id: string;
          owner_account_id: string;
          name: string;
          status: "draft" | "active" | "finalized" | "archived";
          start_date: string | null;
          end_date: string | null;
          description: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_account_id: string;
          name: string;
          status?: "draft" | "active" | "finalized" | "archived";
          start_date?: string | null;
          end_date?: string | null;
          description?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          status?: "draft" | "active" | "finalized" | "archived";
          start_date?: string | null;
          end_date?: string | null;
          description?: string | null;
          notes?: string | null;
        };
      };
      event_accounts: {
        Row: {
          id: string;
          event_id: string;
          account_id: string;
          role_label: string | null;
          visibility: "limited" | "standard";
          created_at: string;
        };
        Insert: {
          event_id: string;
          account_id: string;
          role_label?: string | null;
          visibility?: "limited" | "standard";
        };
        Update: {
          role_label?: string | null;
          visibility?: "limited" | "standard";
        };
      };
      event_locations: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          name: string;
          address?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          address?: string | null;
          notes?: string | null;
        };
      };
      event_services: {
        Row: {
          id: string;
          event_id: string;
          account_id: string | null;
          name: string;
          description: string | null;
          status: "pending" | "confirmed" | "cancelled";
          details: Record<string, unknown> | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          account_id?: string | null;
          name: string;
          description?: string | null;
          status?: "pending" | "confirmed" | "cancelled";
          details?: Record<string, unknown> | null;
        };
        Update: {
          account_id?: string | null;
          name?: string;
          description?: string | null;
          status?: "pending" | "confirmed" | "cancelled";
          details?: Record<string, unknown> | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
        };
      };
      event_schedule_items: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          start_time: string | null;
          end_time: string | null;
          location_id: string | null;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          title: string;
          start_time?: string | null;
          end_time?: string | null;
          location_id?: string | null;
          description?: string | null;
          sort_order?: number;
        };
        Update: {
          title?: string;
          start_time?: string | null;
          end_time?: string | null;
          location_id?: string | null;
          description?: string | null;
          sort_order?: number;
        };
      };
      event_documents: {
        Row: {
          id: string;
          event_id: string;
          uploaded_by: string;
          name: string;
          file_path: string;
          file_type: string | null;
          document_type: "site_map" | "run_sheet" | "vendor_packet" | "insurance_compliance" | "stage_plot" | "parking_load_in" | "misc";
          visibility: "owner_only" | "all_participants";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          uploaded_by: string;
          name: string;
          file_path: string;
          file_type?: string | null;
          document_type?: "site_map" | "run_sheet" | "vendor_packet" | "insurance_compliance" | "stage_plot" | "parking_load_in" | "misc";
          visibility?: "owner_only" | "all_participants";
          notes?: string | null;
        };
        Update: {
          name?: string;
          document_type?: "site_map" | "run_sheet" | "vendor_packet" | "insurance_compliance" | "stage_plot" | "parking_load_in" | "misc";
          visibility?: "owner_only" | "all_participants";
          notes?: string | null;
        };
      };
      activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          summary: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          summary?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      platform_role: "platform_admin" | "staff" | "standard";
      account_role: "account_owner" | "account_manager" | "event_coordinator" | "viewer";
      account_type: "client" | "vendor" | "venue" | "internal" | "performer";
      account_status: "active" | "inactive" | "archived";
      event_status: "draft" | "active" | "finalized" | "archived";
      service_status: "pending" | "confirmed" | "cancelled";
      document_type: "site_map" | "run_sheet" | "vendor_packet" | "insurance_compliance" | "stage_plot" | "parking_load_in" | "misc";
      document_visibility: "owner_only" | "all_participants";
    };
  };
};
