
export enum UploadStatus {
  IDLE = 'IDLE',
  FETCHING = 'FETCHING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface VideoMetadata {
  id: string;
  sourceUrl: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'public' | 'private' | 'unlisted';
  status: UploadStatus;
  progress: number;
  error?: string;
  youtubeId?: string;
}

export interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number;
  isAuthenticated: boolean;
}
