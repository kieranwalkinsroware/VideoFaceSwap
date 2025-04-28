import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { insertVideoSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Create a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!') as any);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Get Replicate API key from environment variables
  const REPLICATE_API_TOKEN = "r8_cvbYA8XelzodXfHEhipOkmi2EWgaRYS4OXUJ0"; // Temporarily hardcoded
  if (!REPLICATE_API_TOKEN) {
    console.warn("Warning: REPLICATE_API_TOKEN is not set. API calls to Replicate will fail.");
  }

  // Create video generation endpoint
  app.post('/api/videos/create', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { prompt, style, duration } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      console.log("Processing file:", req.file.path);
      
      // For now, we're going to use a text-to-video model directly 
      // instead of file upload + face swap which is having API issues
      // This is a temporary solution until we can get the face swap working
      
      // Save the uploaded file information (for potential future processing)
      const fileName = req.file.filename;
      const filePath = req.file.path;
      
      console.log("File saved:", fileName);
      
      // Start the prediction with just the prompt (without face swap for now)
      const enhancedPrompt = `person with appearance like in uploaded image, ${prompt}${style ? `, ${style} style` : ''}`;
      
      // Use a public Stable Video Diffusion model
      const videoResponse = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          // Using Stable Video Diffusion model which is publicly available
          version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", 
          input: {
            prompt: enhancedPrompt,
            negative_prompt: "bad quality, blurry, low resolution, disfigured, ugly face",
            width: 576,
            height: 320,
            num_frames: parseInt(duration) * 24 > 100 ? 100 : parseInt(duration) * 24, // Limit frames to 100
            fps: 24,
            guidance_scale: 7.5,
            motion_bucket_id: 127
          }
        },
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const predictionId = videoResponse.data.id;

      // Store the video creation record
      const videoData = {
        prompt,
        style: style || "realistic",
        duration: parseInt(duration),
        predictionId
      };

      // Validate video data
      const parsedData = insertVideoSchema.safeParse(videoData);
      if (!parsedData.success) {
        return res.status(400).json({ message: "Invalid video data", errors: parsedData.error });
      }

      // Store in our database
      const videoToCreate = {
        ...parsedData.data,
        status: "processing",
        outputUrl: null,
        userId: null // Set userId to null for now (no auth yet)
      };
      
      const video = await storage.createVideo(videoToCreate);

      // Delete the temporary file
      fs.unlinkSync(req.file.path);

      return res.status(201).json({ 
        message: "Video creation started", 
        predictionId,
        videoId: video.id
      });
    } catch (error) {
      console.error("Error in video creation:", error);
      return res.status(500).json({ 
        message: "Failed to start video creation", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get video status endpoint
  app.get('/api/videos/status/:predictionId', async (req: Request, res: Response) => {
    try {
      const { predictionId } = req.params;
      
      if (!predictionId) {
        return res.status(400).json({ message: "Prediction ID is required" });
      }

      console.log("Checking status for prediction:", predictionId);
      
      // Query the actual Replicate API for the prediction status
      let prediction;
      try {
        const replicateResponse = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        prediction = {
          id: replicateResponse.data.id,
          status: replicateResponse.data.status,
          output: replicateResponse.data.output,
          error: replicateResponse.data.error
        };
        
        console.log("Replicate prediction status:", prediction.status);
      } catch (error) {
        console.error("Error fetching prediction from Replicate:", error);
        // In case of error, default to a pending state
        prediction = {
          id: predictionId,
          status: "processing",
          output: null,
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // Find the video in our database
      const video = await storage.getVideoByPredictionId(predictionId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Update video status based on the prediction status
      let videoStatus = video.status;
      let outputUrl = video.outputUrl;

      if (prediction.status === "succeeded" && prediction.output) {
        videoStatus = "completed";
        outputUrl = prediction.output[0]; // Assuming the output is an array with a URL
        
        // Update the video in our database
        await storage.updateVideo(video.id, {
          status: videoStatus,
          outputUrl
        });
      } else if (prediction.status === "failed") {
        videoStatus = "failed";
        
        // Update the video in our database
        await storage.updateVideo(video.id, {
          status: videoStatus
        });
      }

      return res.status(200).json({
        id: video.id,
        status: prediction.status,
        output: outputUrl,
        error: prediction.error
      });
    } catch (error) {
      console.error("Error checking video status:", error);
      return res.status(500).json({ 
        message: "Failed to check video status", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}
