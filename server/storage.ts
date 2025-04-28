import { users, type User, type InsertUser, videos, type Video } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  // User-related operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Video-related operations
  async createVideo(videoData: Omit<Video, 'id' | 'createdAt' | 'metadata'>): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values({
        ...videoData,
        metadata: {} // Initialize empty metadata
      })
      .returning();
    return video;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, id));
    return video;
  }

  async getVideoByPredictionId(predictionId: string): Promise<Video | undefined> {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.predictionId, predictionId));
    return video;
  }

  async updateVideo(id: number, updates: Partial<Video>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    
    if (!video) {
      throw new Error(`Video with ID ${id} not found`);
    }
    
    return video;
  }

  async listVideos(limit?: number): Promise<Video[]> {
    // Create the query without the limit first
    const baseQuery = db
      .select()
      .from(videos)
      .orderBy(desc(videos.createdAt));
      
    // Execute with limit if specified
    if (limit) {
      return await baseQuery.limit(limit);
    }
    
    // Execute without limit
    return await baseQuery;
  }
}

export const storage = new DatabaseStorage();
