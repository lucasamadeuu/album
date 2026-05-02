export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      stickers: {
        Row: {
          id: string;
          album_number: number | null;
          album_code: string | null;
          sticker_kind: string;
          api_player_id: number | null;
          player_name: string;
          team_name: string;
          api_team_id: number | null;
          photo_url: string | null;
          position: string | null;
          shirt_number: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          album_number?: number | null;
          album_code?: string | null;
          sticker_kind?: string;
          api_player_id?: number | null;
          player_name: string;
          team_name: string;
          api_team_id?: number | null;
          photo_url?: string | null;
          position?: string | null;
          shirt_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          album_number?: number | null;
          album_code?: string | null;
          sticker_kind?: string;
          api_player_id?: number | null;
          player_name?: string;
          team_name?: string;
          api_team_id?: number | null;
          photo_url?: string | null;
          position?: string | null;
          shirt_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_owned_stickers: {
        Row: {
          user_id: string;
          sticker_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          sticker_id: string;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          sticker_id?: string;
          quantity?: number;
          created_at?: string;
        };
      };
    };
  };
};
