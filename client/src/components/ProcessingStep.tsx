import { Progress } from "@/components/ui/progress";
import { Check, Clock, Cog } from "lucide-react";

type ProcessingStepStatus = 'not-started' | 'in-progress' | 'completed';

interface ProcessingStepProps {
  isVisible: boolean;
  progress: number;
  currentStep: string;
  isLoading: boolean;
}

export default function ProcessingStep({ 
  isVisible, 
  progress, 
  currentStep, 
  isLoading 
}: ProcessingStepProps) {
  if (!isVisible) return null;

  const steps = [
    { id: 'upload', name: 'Uploading your media' },
    { id: 'analyze', name: 'Analyzing facial features' },
    { id: 'generate', name: 'Generating base video from prompt' },
    { id: 'transform', name: 'Applying face transformation' },
    { id: 'finalize', name: 'Finalizing video' }
  ];

  // Determine the status of each processing step
  const getStepStatus = (stepId: string): ProcessingStepStatus => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'in-progress';
    return 'not-started';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Creating your AI video</h2>
      <p className="text-gray-500 text-sm mb-4">This may take a few minutes. Please don't close this page.</p>
      
      <div className="space-y-8 py-8">
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Processing</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full h-2.5" />
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Processing steps:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              
              return (
                <li key={step.id} className={`flex items-center ${status === 'not-started' ? 'text-gray-400' : ''}`}>
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full mr-2 ${
                    status === 'completed' ? 'bg-green-600 text-white' :
                    status === 'in-progress' ? 'bg-primary text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {status === 'completed' && <Check className="h-3 w-3" />}
                    {status === 'in-progress' && <Cog className="h-3 w-3 animate-spin" />}
                    {status === 'not-started' && <Clock className="h-3 w-3" />}
                  </span>
                  {step.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
