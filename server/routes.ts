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

      // Prepare the file for upload to Replicate
      const filePath = req.file.path;
      const fileStream = fs.createReadStream(filePath);
      
      // Create a FormData instance for the Replicate API
      const formData = new FormData();
      formData.append('image', fileStream);

      // Upload file to Replicate
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

      const uploadUrl = uploadResponse.data.upload_url;
      const uploadId = uploadResponse.data.id;

      // Now start the prediction with the uploaded image
      const enhancedPrompt = `${prompt}${style ? `, ${style} style` : ''}`;
      
      // For this example, we'll use a face swap model and a text-to-video model
      // First, generate the base video from the prompt
      const videoResponse = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: "2d087d66a857642e3dc97df3558fa788f7e1dfaef73ec91f28a3522c47a09250", // Sample Replicate model
          input: {
            prompt: enhancedPrompt,
            negative_prompt: "bad quality, blurry, low resolution",
            width: 576,
            height: 320,
            num_frames: parseInt(duration) * 24, // Frames based on duration
            fps: 24
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
      const video = await storage.createVideo({
        ...parsedData.data,
        status: "processing",
        outputUrl: null
      });

      // Delete the temporary file
      fs.unlinkSync(filePath);

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

      // Check status from Replicate
      const response = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const prediction = response.data;

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
