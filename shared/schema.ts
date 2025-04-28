import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep the original users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Create a videos table to track video generations
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),  // Optional userId if we have user authentication
  prompt: text("prompt").notNull(),
  style: text("style").notNull(),
  duration: integer("duration").notNull(),
  status: text("status").notNull().default("processing"),
  outputUrl: text("output_url"),
  predictionId: text("prediction_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  metadata: json("metadata") // Store additional metadata about the generation process
});

// Create the insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  prompt: true,
  style: true,
  duration: true,
  predictionId: true,
}).extend({
  // Add validation rules as needed
  prompt: z.string().min(5, "Prompt must be at least 5 characters long"),
  style: z.string(),
  duration: z.number().int().min(5).max(30),
  predictionId: z.string().min(1)
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
