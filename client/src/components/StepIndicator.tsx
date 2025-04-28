import { 
  Camera, 
  MessageSquare, 
  Cog, 
  Check
} from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { id: 1, name: "Upload", icon: Camera },
    { id: 2, name: "Prompt", icon: MessageSquare },
    { id: 3, name: "Processing", icon: Cog },
    { id: 4, name: "Result", icon: Check }
  ];

  return (
    <div className="flex items-center justify-between mb-8 relative">
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10"></div>
      
      {steps.map((step) => (
        <div key={step.id} className="flex flex-col items-center relative z-10">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
            step.id <= currentStep ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
          }`}>
            <step.icon className="w-5 h-5" />
          </div>
          <span className={`text-sm font-medium ${
            step.id <= currentStep ? "text-foreground" : "text-gray-500"
          }`}>
            {step.name}
          </span>
        </div>
      ))}
    </div>
  );
}
