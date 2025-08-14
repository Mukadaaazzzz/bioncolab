export interface Lab {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface LabMember {
  lab_id: string;
  user_id: string;
  role: 'owner' | 'maintainer' | 'contributor' | 'viewer';
  created_at: string;
}

export interface LabFile {
  id: string;
  lab_id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_by: string;
  created_at: string;
}

export interface LabCommit {
  id: string;
  lab_id: string;
  user_id: string;
  message: string;
  previous_commit_id: string | null;
  created_at: string;
}