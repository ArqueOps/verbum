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
          content: string
          created_at: string
          id: string
          is_published: boolean
          language: string
          model_used: string
          owner_id: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          verse_reference: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          language?: string
          model_used: string
          owner_id?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          verse_reference: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          language?: string
          model_used?: string
          owner_id?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          verse_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "studies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_bookmarks: {
        Row: {
          created_at: string
          id: string
          study_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          study_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          study_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_bookmarks_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
