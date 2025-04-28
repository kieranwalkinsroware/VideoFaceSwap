import { useState } from 'react';
import StepIndicator from "@/components/StepIndicator";
import UploadStep from "@/components/UploadStep";
import PromptStep from "@/components/PromptStep";
import ProcessingStep from "@/components/ProcessingStep";
import ResultStep from "@/components/ResultStep";
import Notification from "@/components/Notification";
import { useVideoCreator } from "@/hooks/use-video-creator";
import { FileData, NotificationType } from "@/types";

export default function Home() {
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [duration, setDuration] = useState("10");
  const [notification, setNotification] = useState<{ message: string; type: NotificationType; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });

  const { 
    createVideo, 
    videoUrl, 
    progress, 
    processingStep, 
    isLoading, 
    isSuccess, 
    isError, 
    error 
  } = useVideoCreator();

  const handleFileChange = (data: FileData | null) => {
    setFileData(data);
  };

  const handleRemoveFile = () => {
    setFileData(null);
  };

  const goToStep = (newStep: number) => {
    setStep(newStep);
  };

  const handleContinue = () => {
    if (!fileData) {
      showNotification("Please upload a file first", "error");
      return;
    }
    goToStep(2);
  };

  const handleBack = () => {
    goToStep(1);
  };

  const handlePromptSubmit = () => {
    if (!prompt.trim()) {
      showNotification("Please enter a prompt for your video", "error");
      return;
    }

    if (!fileData) {
      showNotification("File data is missing, please go back and upload again", "error");
      return;
    }

    goToStep(3);
    createVideo({
      file: fileData.file,
      prompt,
      style,
      duration: parseInt(duration)
    });
  };

  const handleCreateNew = () => {
    setFileData(null);
    setPrompt("");
    setStyle("realistic");
    setDuration("10");
    goToStep(1);
  };

  const showNotification = (message: string, type: NotificationType = "info") => {
    setNotification({
      message,
      type,
      visible: true
    });

    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  // Handle API errors
  if (isError && error) {
    showNotification(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, "error");
  }

  // Auto-advance to result page when processing is complete
  if (isSuccess && step === 3) {
    goToStep(4);
    showNotification("Your AI video is ready!", "success");
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header Section */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-foreground mb-2">AI Video Creator</h1>
          <p className="text-gray-500">Create personalized AI videos with your face</p>
        </header>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
          {/* Steps Indicator */}
          <StepIndicator currentStep={step} />

          {/* Multi-step Form */}
          <div className="space-y-8">
            {/* Step 1: Upload */}
            <UploadStep 
              isVisible={step === 1}
              onFileChange={handleFileChange}
              onContinue={handleContinue}
              onRemoveFile={handleRemoveFile}
              fileData={fileData}
            />
            
            {/* Step 2: Prompt */}
            <PromptStep 
              isVisible={step === 2}
              prompt={prompt}
              style={style}
              duration={duration}
              onPromptChange={setPrompt}
              onStyleChange={setStyle}
              onDurationChange={setDuration}
              onBack={handleBack}
              onSubmit={handlePromptSubmit}
            />
            
            {/* Step 3: Processing */}
            <ProcessingStep 
              isVisible={step === 3}
              progress={progress}
              currentStep={processingStep}
              isLoading={isLoading}
            />
            
            {/* Step 4: Result */}
            <ResultStep 
              isVisible={step === 4}
              videoUrl={videoUrl || ""}
              prompt={`${prompt}${style ? `, ${style} style` : ""}`}
              onCreateNew={handleCreateNew}
            />
          </div>
        </div>
        
        {/* Info Section */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Tips for best results</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary mr-2"><i className="fas fa-check-circle mt-0.5"></i></span>
              <span>Use clear, well-lit photos that show your face directly</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2"><i className="fas fa-check-circle mt-0.5"></i></span>
              <span>For videos, use clips where your face is clearly visible and not moving too quickly</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2"><i className="fas fa-check-circle mt-0.5"></i></span>
              <span>Write detailed prompts that describe the scene, actions, and style you want</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2"><i className="fas fa-check-circle mt-0.5"></i></span>
              <span>For best face replacement, choose prompts with similar head positions as your source image</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Notification Component */}
      <Notification 
        message={notification.message} 
        type={notification.type} 
        isVisible={notification.visible} 
      />
    </div>
  );
}
