export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_contacts: {
        Row: {
          id: string
          account_id: string
          name: string
          email: string | null
          phone: string | null
          role_label: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          email?: string | null
          phone?: string | null
          role_label?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          role_label?: string | null
          notes?: string | null
          created_at?: string
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
          id: string
          owner_account_id: string
          linkable_account_id: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_account_id: string
          linkable_account_id: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_account_id?: string
          linkable_account_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_linkable_accounts_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_linkable_accounts_linkable_account_id_fkey"
            columns: ["linkable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_membership_permissions: {
        Row: {
          id: string
          membership_id: string
          permission_key: string
          created_at: string
        }
        Insert: {
          id?: string
          membership_id: string
          permission_key: string
          created_at?: string
        }
        Update: {
          id?: string
          membership_id?: string
          permission_key?: string
          created_at?: string
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
          id: string
          account_id: string
          profile_id: string
          account_role: Database["public"]["Enums"]["account_role"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          profile_id: string
          account_role?: Database["public"]["Enums"]["account_role"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          profile_id?: string
          account_role?: Database["public"]["Enums"]["account_role"]
          created_at?: string
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
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          status: Database["public"]["Enums"]["account_status"]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          status?: Database["public"]["Enums"]["account_status"]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          status?: Database["public"]["Enums"]["account_status"]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          actor_id: string | null
          entity_type: string
          entity_id: string
          action: string
          summary: string | null
          metadata: Json | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          entity_type: string
          entity_id: string
          action: string
          summary?: string | null
          metadata?: Json | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          entity_type?: string
          entity_id?: string
          action?: string
          summary?: string | null
          metadata?: Json | null
          details?: Json | null
          created_at?: string
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
          id: string
          event_id: string
          account_id: string
          role_label: string | null
          visibility: Database["public"]["Enums"]["participant_visibility"]
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          account_id: string
          role_label?: string | null
          visibility?: Database["public"]["Enums"]["participant_visibility"]
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          account_id?: string
          role_label?: string | null
          visibility?: Database["public"]["Enums"]["participant_visibility"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_accounts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contact_roles: {
        Row: {
          id: string
          event_id: string
          contact_id: string
          role_label: string | null
          visibility: Database["public"]["Enums"]["contact_visibility"]
          sort_order: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          contact_id: string
          role_label?: string | null
          visibility?: Database["public"]["Enums"]["contact_visibility"]
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          contact_id?: string
          role_label?: string | null
          visibility?: Database["public"]["Enums"]["contact_visibility"]
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_contact_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contact_roles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "account_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_documents: {
        Row: {
          id: string
          event_id: string
          uploaded_by: string
          name: string
          file_path: string
          file_type: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          visibility: Database["public"]["Enums"]["document_visibility"]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          uploaded_by: string
          name: string
          file_path: string
          file_type?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          visibility?: Database["public"]["Enums"]["document_visibility"]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          uploaded_by?: string
          name?: string
          file_path?: string
          file_type?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          visibility?: Database["public"]["Enums"]["document_visibility"]
          notes?: string | null
          created_at?: string
          updated_at?: string
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
          id: string
          event_id: string
          name: string
          address: string | null
          location_type: string | null
          map_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          address?: string | null
          location_type?: string | null
          map_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          address?: string | null
          location_type?: string | null
          map_url?: string | null
          notes?: string | null
          created_at?: string
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
          id: string
          event_id: string
          title: string
          start_time: string | null
          end_time: string | null
          location_id: string | null
          description: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          title: string
          start_time?: string | null
          end_time?: string | null
          location_id?: string | null
          description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          title?: string
          start_time?: string | null
          end_time?: string | null
          location_id?: string | null
          description?: string | null
          sort_order?: number
          created_at?: string
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
          id: string
          event_id: string
          account_id: string | null
          name: string
          description: string | null
          status: Database["public"]["Enums"]["service_status"]
          details: Json | null
          confirmed_by: string | null
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          account_id?: string | null
          name: string
          description?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          details?: Json | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          account_id?: string | null
          name?: string
          description?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          details?: Json | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_services_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
        ]
      }
      events: {
        Row: {
          id: string
          owner_account_id: string
          name: string
          status: Database["public"]["Enums"]["event_status"]
          start_date: string | null
          end_date: string | null
          description: string | null
          notes: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_account_id: string
          name: string
          status?: Database["public"]["Enums"]["event_status"]
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          notes?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_account_id?: string
          name?: string
          status?: Database["public"]["Enums"]["event_status"]
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          notes?: string | null
          timezone?: string
          created_at?: string
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
          id: string
          email: string
          full_name: string | null
          platform_role: Database["public"]["Enums"]["platform_role"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_confirm_vendor: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_edit_event: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_manage_documents: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_manage_event_contacts: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_manage_event_participants: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_manage_schedule: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_manage_services: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      can_view_event: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      event_summary: {
        Args: {
          p_event_id: string
        }
        Returns: {
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          start_date: string | null
          end_date: string | null
          description: string | null
          owner_account_id: string
          owner_account_name: string
          timezone: string
          is_owner: boolean
          participant_visibility_level: string | null
          participant_count: number
          service_count: number
          schedule_item_count: number
          document_count: number
          location_count: number
          contact_count: number
          can_edit: boolean
          can_manage_participants: boolean
          can_manage_services: boolean
          can_manage_schedule_items: boolean
          can_manage_docs: boolean
          can_manage_contacts: boolean
          can_confirm_vendors: boolean
          event_updated_at: string
        }[]
      }
      get_default_permissions: {
        Args: {
          role: Database["public"]["Enums"]["account_role"]
        }
        Returns: string[]
      }
      get_participant_visibility: {
        Args: {
          p_event_id: string
        }
        Returns: string
      }
      has_account_permission: {
        Args: {
          p_account_id: string
          p_permission_key: string
        }
        Returns: boolean
      }
      has_event_permission: {
        Args: {
          p_event_id: string
          p_permission_key: string
        }
        Returns: boolean
      }
      is_account_member: {
        Args: {
          p_account_id: string
        }
        Returns: boolean
      }
      is_event_participant: {
        Args: {
          p_event_id: string
        }
        Returns: boolean
      }
      is_platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_staff: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      membership_has_permission: {
        Args: {
          p_membership_id: string
          p_permission_key: string
        }
        Returns: boolean
      }
      my_events_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_id: string
          event_name: string
          event_status: Database["public"]["Enums"]["event_status"]
          start_date: string | null
          end_date: string | null
          owner_account_id: string
          owner_account_name: string
          user_role: string
          is_owner_account: boolean
          role_label: string | null
          primary_location: string | null
          next_schedule_item: string | null
        }[]
      }
    }
    Enums: {
      account_role: "account_owner" | "account_manager" | "event_coordinator" | "viewer"
      account_status: "active" | "inactive" | "archived"
      account_type: "client" | "vendor" | "venue" | "internal" | "performer"
      contact_visibility: "owner_only" | "all_participants"
      document_type: "site_map" | "run_sheet" | "vendor_packet" | "insurance_compliance" | "stage_plot" | "parking_load_in" | "misc"
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
