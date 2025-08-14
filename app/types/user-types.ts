export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  reputation_score: number;
  bio: string | null;
  institution: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    profile: UserProfile | null;
  };
}