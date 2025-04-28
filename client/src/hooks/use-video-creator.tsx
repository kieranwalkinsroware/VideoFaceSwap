import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CreateVideoParams {
  file: File;
  prompt: string;
  style: string;
  duration: number;
}

export function useVideoCreator() {
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("upload");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const createVideoMutation = useMutation({
    mutationFn: async (params: CreateVideoParams) => {
      // Create a FormData object to send the file and parameters
      const formData = new FormData();
      formData.append("file", params.file);
      formData.append("prompt", params.prompt);
      formData.append("style", params.style);
      formData.append("duration", params.duration.toString());

      // Start the video creation process
      setProcessingStep("upload");
      setProgress(10);
      
      // Upload file and start processing
      const response = await fetch("/api/videos/create", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to start video creation");
      }

      const { predictionId } = await response.json();
      
      // Start checking the status
      return pollPredictionStatus(predictionId);
    },
  });

  // Function to poll the prediction status
  const pollPredictionStatus = async (predictionId: string): Promise<string> => {
    setProcessingStep("analyze");
    setProgress(30);

    let result;
    let attempts = 0;
    const maxAttempts = 60; // Maximum polling attempts (10 minutes at 10 second intervals)
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Simulate progress advancement
      if (progress < 90) {
        setProgress(prev => {
          const increment = Math.random() * 10; // Random increment
          return Math.min(prev + increment, 90); // Cap at 90% until finished
        });
      }

      // Update processing step based on progress
      if (progress > 30 && progress <= 50) setProcessingStep("generate");
      if (progress > 50 && progress <= 70) setProcessingStep("transform");
      if (progress > 70) setProcessingStep("finalize");
      
      try {
        const res = await apiRequest("GET", `/api/videos/status/${predictionId}`);
        const data = await res.json();
        
        if (data.status === "succeeded") {
          // Set progress to 100% when done
          setProgress(100);
          setProcessingStep("finalize");
          
          // Return the video URL
          if (data.output && data.output.length > 0) {
            const videoUrl = data.output;
            setVideoUrl(videoUrl);
            return videoUrl;
          }
          throw new Error("No output URL in the completed prediction");
        }
        
        if (data.status === "failed") {
          throw new Error(data.error || "Video generation failed");
        }
        
        // Wait for 10 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        throw error;
      }
    }
    
    throw new Error("Prediction timed out");
  };

  return {
    createVideo: createVideoMutation.mutate,
    isLoading: createVideoMutation.isPending,
    isSuccess: createVideoMutation.isSuccess,
    isError: createVideoMutation.isError, 
    error: createVideoMutation.error,
    progress,
    processingStep,
    videoUrl
  };
}
