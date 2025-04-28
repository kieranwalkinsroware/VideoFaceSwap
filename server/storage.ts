import { users, type User, type InsertUser, videos, type Video } from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Video-related operations
  createVideo(video: Omit<Video, 'id' | 'createdAt' | 'metadata'>): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByPredictionId(predictionId: string): Promise<Video | undefined>;
  updateVideo(id: number, updates: Partial<Video>): Promise<Video>;
  listVideos(limit?: number): Promise<Video[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private videos: Map<number, Video>;
  private userCurrentId: number;
  private videoCurrentId: number;

  constructor() {
    this.users = new Map();
    this.videos = new Map();
    this.userCurrentId = 1;
    this.videoCurrentId = 1;
  }

  // User-related operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Video-related operations
  async createVideo(videoData: Omit<Video, 'id' | 'createdAt' | 'metadata'>): Promise<Video> {
    const id = this.videoCurrentId++;
    const now = new Date().toISOString();
    
    const video: Video = { 
      ...videoData, 
      id, 
      createdAt: now,
      metadata: {}
    };
    
    this.videos.set(id, video);
    return video;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideoByPredictionId(predictionId: string): Promise<Video | undefined> {
    return Array.from(this.videos.values()).find(
      (video) => video.predictionId === predictionId,
    );
  }

  async updateVideo(id: number, updates: Partial<Video>): Promise<Video> {
    const video = this.videos.get(id);
    if (!video) {
      throw new Error(`Video with ID ${id} not found`);
    }
    
    const updatedVideo = { ...video, ...updates };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async listVideos(limit?: number): Promise<Video[]> {
    const videos = Array.from(this.videos.values());
    // Sort by creation date in descending order (newest first)
    videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (limit) {
      return videos.slice(0, limit);
    }
    
    return videos;
  }
}

export const storage = new MemStorage();
