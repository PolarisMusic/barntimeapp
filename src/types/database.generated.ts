export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_contacts: {
        Row: {
          account_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role_label: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role_label?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_linkable_accounts: {
        Row: {
          created_at: string
          id: string
          linkable_account_id: string
          owner_account_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linkable_account_id: string
          owner_account_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linkable_account_id?: string
          owner_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_linkable_accounts_linkable_account_id_fkey"
            columns: ["linkable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_linkable_accounts_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_membership_permissions: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          permission_key: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_membership_permissions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "account_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      account_memberships: {
        Row: {
          account_id: string
          account_role: Database["public"]["Enums"]["account_role"]
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          account_role?: Database["public"]["Enums"]["account_role"]
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_role?: Database["public"]["Enums"]["account_role"]
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["account_status"]
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_accounts: {
        Row: {
          account_id: string
          created_at: string
          event_id: string
          id: string
          role_label: string | null
          visibility: Database["public"]["Enums"]["participant_visibility"]
        }
        Insert: {
          account_id: string
          created_at?: string
          event_id: string
          id?: string
          role_label?: string | null
          visibility?: Database["public"]["Enums"]["participant_visibility"]
        }
        Update: {
          account_id?: string
          created_at?: string
          event_id?: string
          id?: string
          role_label?: string | null
          visibility?: Database["public"]["Enums"]["participant_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "event_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_accounts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contact_roles: {
        Row: {
          contact_id: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          role_label: string | null
          sort_order: number
          updated_at: string
          visibility: Database["public"]["Enums"]["contact_visibility"]
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          role_label?: string | null
          sort_order?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["contact_visibility"]
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          role_label?: string | null
          sort_order?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["contact_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "event_contact_roles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "account_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contact_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          event_id: string
          file_path: string
          file_type: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          uploaded_by: string
          visibility: Database["public"]["Enums"]["document_visibility"]
        }
        Insert: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          event_id: string
          file_path: string
          file_type?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          uploaded_by: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          event_id?: string
          file_path?: string
          file_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          address: string | null
          created_at: string
          event_id: string
          id: string
          location_type: string | null
          map_url: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          event_id: string
          id?: string
          location_type?: string | null
          map_url?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          event_id?: string
          id?: string
          location_type?: string | null
          map_url?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedule_items: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_id: string
          id: string
          location_id: string | null
          sort_order: number
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          location_id?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          location_id?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedule_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "event_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_services: {
        Row: {
          account_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          description: string | null
          details: Json | null
          event_id: string
          id: string
          name: string
          status: Database["public"]["Enums"]["service_status"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string | null
          details?: Json | null
          event_id: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string | null
          details?: Json | null
          event_id?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_services_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_services_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_services_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          owner_account_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["event_status"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_account_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_account_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          platform_role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_confirm_vendor: { Args: { p_event_id: string }; Returns: boolean }
      can_edit_event: { Args: { p_event_id: string }; Returns: boolean }
      can_manage_documents: { Args: { p_event_id: string }; Returns: boolean }
      can_manage_event_contacts: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_manage_event_participants: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_manage_schedule: { Args: { p_event_id: string }; Returns: boolean }
      can_manage_services: { Args: { p_event_id: string }; Returns: boolean }
      can_view_event: { Args: { p_event_id: string }; Returns: boolean }
      event_summary: {
        Args: { p_event_id: string }
        Returns: {
          can_confirm_vendors: boolean
          can_edit: boolean
          can_manage_contacts: boolean
          can_manage_docs: boolean
          can_manage_participants: boolean
          can_manage_schedule_items: boolean
          can_manage_services: boolean
          contact_count: number
          description: string
          document_count: number
          end_date: string
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          event_updated_at: string
          is_owner: boolean
          location_count: number
          owner_account_id: string
          owner_account_name: string
          participant_count: number
          participant_visibility_level: string
          schedule_item_count: number
          service_count: number
          start_date: string
          timezone: string
        }[]
      }
      get_default_permissions: {
        Args: { role: Database["public"]["Enums"]["account_role"] }
        Returns: string[]
      }
      get_effective_permissions: {
        Args: { p_membership_id: string }
        Returns: string[]
      }
      get_participant_visibility: {
        Args: { p_event_id: string }
        Returns: string
      }
      has_account_permission: {
        Args: { p_account_id: string; p_permission_key: string }
        Returns: boolean
      }
      has_event_permission: {
        Args: { p_event_id: string; p_permission_key: string }
        Returns: boolean
      }
      is_account_member: { Args: { p_account_id: string }; Returns: boolean }
      is_event_owner_member: { Args: { p_event_id: string }; Returns: boolean }
      is_event_participant: { Args: { p_event_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      membership_has_permission: {
        Args: { p_membership_id: string; p_permission_key: string }
        Returns: boolean
      }
      my_events_dashboard: {
        Args: never
        Returns: {
          end_date: string
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          is_owner_account: boolean
          next_schedule_time: string
          next_schedule_title: string
          owner_account_id: string
          owner_account_name: string
          primary_location_name: string
          start_date: string
          updated_at: string
          user_role: string
        }[]
      }
    }
    Enums: {
      account_role:
        | "account_owner"
        | "account_manager"
        | "event_coordinator"
        | "viewer"
      account_status: "active" | "inactive" | "archived"
      account_type: "client" | "vendor" | "venue" | "internal" | "performer"
      contact_visibility: "owner_only" | "all_participants"
      document_type:
        | "site_map"
        | "run_sheet"
        | "vendor_packet"
        | "insurance_compliance"
        | "stage_plot"
        | "parking_load_in"
        | "misc"
      document_visibility: "owner_only" | "all_participants"
      event_status: "draft" | "active" | "finalized" | "archived"
      participant_visibility: "limited" | "standard"
      platform_role: "platform_admin" | "staff" | "standard"
      service_status: "pending" | "confirmed" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: [
        "account_owner",
        "account_manager",
        "event_coordinator",
        "viewer",
      ],
      account_status: ["active", "inactive", "archived"],
      account_type: ["client", "vendor", "venue", "internal", "performer"],
      contact_visibility: ["owner_only", "all_participants"],
      document_type: [
        "site_map",
        "run_sheet",
        "vendor_packet",
        "insurance_compliance",
        "stage_plot",
        "parking_load_in",
        "misc",
      ],
      document_visibility: ["owner_only", "all_participants"],
      event_status: ["draft", "active", "finalized", "archived"],
      participant_visibility: ["limited", "standard"],
      platform_role: ["platform_admin", "staff", "standard"],
      service_status: ["pending", "confirmed", "cancelled"],
    },
  },
} as const

