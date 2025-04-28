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
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
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
      
      // First, upload the face image to Replicate
      // Create form data for the file upload
      const formData = new FormData();
      const fileStream = fs.createReadStream(req.file.path);
      formData.append('file', fileStream);
      
      // Upload the face image to Replicate
      const uploadResponse = await axios.post(
        'https://api.replicate.com/v1/uploads',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Token ${REPLICATE_API_TOKEN}`
          }
        }
      );
      
      const uploadUrl = uploadResponse.data.urls.get;
      const uploadId = uploadResponse.data.upload_id;
      
      console.log("File uploaded to Replicate:", uploadUrl);
      
      // Now start the prediction with the uploaded image
      const enhancedPrompt = `${prompt}${style ? `, ${style} style` : ''}`;
      
      // For face swapping, we'll use a specialized face swap model
      const videoResponse = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          // Using the VideoFaceSwap model for proper face swapping
          version: "a53cdd14a93707e0e7687dce11ecb1f560ed4d1cdf8a2aab71a323d5aef1941a", 
          input: {
            face_image: uploadUrl,  // The uploaded face image
            target_video: "https://replicate.delivery/pbxt/IrGsZSgj8JerJFnIj89Oq1s5gweVqB0qplrmG1PoiuWZ3ThQA/dancing.mp4", // Default target video
            face_restoration: true,
            result_video_path: ".mp4",
            prompt: enhancedPrompt, // The user's prompt
            duration: parseInt(duration), // The requested duration
            style: style || "realistic"
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
