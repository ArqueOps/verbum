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
      bible_books: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          name: string
          position: number
          testament: string
          total_chapters: number
          updated_at: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          name: string
          position: number
          testament: string
          total_chapters: number
          updated_at?: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          testament?: string
          total_chapters?: number
          updated_at?: string
        }
        Relationships: []
      }
      bible_versions: {
        Row: {
          abbr: string
          created_at: string
          description: string | null
          id: number
          is_original: boolean
          language: string
          name: string
          updated_at: string
        }
        Insert: {
          abbr: string
          created_at?: string
          description?: string | null
          id?: number
          is_original?: boolean
          language?: string
          name: string
          updated_at?: string
        }
        Update: {
          abbr?: string
          created_at?: string
          description?: string | null
          id?: number
          is_original?: boolean
          language?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          abbr: string
          chapters_count: number
          created_at: string
          id: number
          name: string
          position: number
          testament: string
          updated_at: string
        }
        Insert: {
          abbr: string
          chapters_count: number
          created_at?: string
          id?: number
          name: string
          position: number
          testament: string
          updated_at?: string
        }
        Update: {
          abbr?: string
          chapters_count?: number
          created_at?: string
          id?: number
          name?: string
          position?: number
          testament?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: number
          chapter_number: number
          created_at: string
          id: number
          updated_at: string
          verses_count: number
        }
        Insert: {
          book_id: number
          chapter_number: number
          created_at?: string
          id?: number
          updated_at?: string
          verses_count: number
        }
        Update: {
          book_id?: number
          chapter_number?: number
          created_at?: string
          id?: number
          updated_at?: string
          verses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_version: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferred_version?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_version?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_preferred_version"
            columns: ["preferred_version"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          book_id: number | null
          chapter: number | null
          content: Json
          created_at: string
          generation_time_ms: number | null
          id: string
          is_published: boolean
          language: string
          model_used: string
          owner_id: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          verse_end: number | null
          verse_reference: string
          verse_start: number | null
          version_id: number | null
          view_count: number
        }
        Insert: {
          book_id?: number | null
          chapter?: number | null
          content: Json
          created_at?: string
          generation_time_ms?: number | null
          id?: string
          is_published?: boolean
          language?: string
          model_used: string
          owner_id?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          verse_end?: number | null
          verse_reference: string
          verse_start?: number | null
          version_id?: number | null
          view_count?: number
        }
        Update: {
          book_id?: number | null
          chapter?: number | null
          content?: Json
          created_at?: string
          generation_time_ms?: number | null
          id?: string
          is_published?: boolean
          language?: string
          model_used?: string
          owner_id?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          verse_end?: number | null
          verse_reference?: string
          verse_start?: number | null
          version_id?: number | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "studies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studies_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          order_index: number
          section_type: string
          study_id: string
          title: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          order_index: number
          section_type: string
          study_id: string
          title: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          section_type?: string
          study_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sections_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_credentials: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          status: "active" | "past_due" | "canceled" | "expired"
          plan_id: string
          plan_interval: "monthly" | "annual" | null
          current_period_start: string | null
          current_period_end: string | null
          caramelou_subscription_id: string | null
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: "active" | "past_due" | "canceled" | "expired"
          plan_id?: string
          plan_interval?: "monthly" | "annual" | null
          current_period_start?: string | null
          current_period_end?: string | null
          caramelou_subscription_id?: string | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: "active" | "past_due" | "canceled" | "expired"
          plan_id?: string
          plan_interval?: "monthly" | "annual" | null
          current_period_start?: string | null
          current_period_end?: string | null
          caramelou_subscription_id?: string | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_admin_actions: {
        Row: {
          id: string
          subscription_id: string | null
          user_id: string
          action_type: "grant" | "revoke" | "extend"
          plan_interval: "monthly" | "annual" | null
          period_months: number | null
          extend_days: number | null
          reason: string | null
          performed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id?: string | null
          user_id: string
          action_type: "grant" | "revoke" | "extend"
          plan_interval?: "monthly" | "annual" | null
          period_months?: number | null
          extend_days?: number | null
          reason?: string | null
          performed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string | null
          user_id?: string
          action_type?: "grant" | "revoke" | "extend"
          plan_interval?: "monthly" | "annual" | null
          period_months?: number | null
          extend_days?: number | null
          reason?: string | null
          performed_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_admin_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_cancellations: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          reason: string | null
          canceled_at: string
          canceled_by: string | null
          action_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          reason?: string | null
          canceled_at?: string
          canceled_by?: string | null
          action_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          reason?: string | null
          canceled_at?: string
          canceled_by?: string | null
          action_type?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cancellations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          event_id: string
          event_type: string
          user_id: string | null
          payload: Json
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          event_type: string
          user_id?: string | null
          payload: Json
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          event_type?: string
          user_id?: string | null
          payload?: Json
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_daily_limit: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      save_study_with_daily_limit: {
        Args: {
          p_user_id: string
          p_title: string
          p_content: string
          p_book?: string | null
          p_chapter?: number | null
          p_verse_start?: number | null
          p_verse_end?: number | null
          p_sections?: Json
          p_version_id?: string | null
          p_slug?: string | null
        }
        Returns: string
      }
      search_published_studies: {
        Args: {
          query?: string
          testament?: string
          book_id?: string
        }
        Returns: {
          id: string
          title: string
          slug: string
          verse_reference: string
          published_at: string | null
          book_name: string | null
          book_abbreviation: string | null
          book_testament: string | null
          summary: string | null
          author_name: string | null
        }[]
      }
    }
    Enums: {
      user_role: "free" | "premium" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["free", "premium", "admin"] as const,
    },
  },
} as const
