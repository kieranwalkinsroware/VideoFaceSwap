export interface FileData {
  file: File;
  url: string;
  name: string;
  type: 'image' | 'video';
}

export type VideoStatus = 'processing' | 'completed' | 'failed';

export type NotificationType = 'info' | 'success' | 'error';

export interface VideoCreation {
  id: number;
  userId: number;
  prompt: string;
  style: string;
  duration: number;
  status: VideoStatus;
  outputUrl: string | null;
  predictionId: string;
  createdAt: string;
}

export interface VideoCreationRequest {
  prompt: string;
  style: string;
  duration: number;
  file: File;
}

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string[] | null;
  error: string | null;
}
