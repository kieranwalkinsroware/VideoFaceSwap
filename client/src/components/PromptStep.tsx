import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PromptStepProps {
  isVisible: boolean;
  prompt: string;
  style: string;
  duration: string;
  onPromptChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function PromptStep({ 
  isVisible, 
  prompt, 
  style, 
  duration, 
  onPromptChange, 
  onStyleChange, 
  onDurationChange, 
  onBack, 
  onSubmit 
}: PromptStepProps) {
  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Create your video prompt</h2>
      <p className="text-gray-500 text-sm mb-4">Describe the scene or action you want your AI video to show.</p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Your prompt
          </Label>
          <Textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Example: A person with my face walking on the moon in a spacesuit"
          />
          <p className="mt-1 text-sm text-gray-500">Be descriptive about the scene, setting, actions, and mood.</p>
        </div>
        
        <div>
          <Label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-1">
            Video style (optional)
          </Label>
          <Select value={style} onValueChange={onStyleChange}>
            <SelectTrigger id="style" className="w-full">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="anime">Anime</SelectItem>
              <SelectItem value="cartoon">Cartoon</SelectItem>
              <SelectItem value="3d">3D Animation</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duration
          </Label>
          <Select value={duration} onValueChange={onDurationChange}>
            <SelectTrigger id="duration" className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="15">15 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSubmit}>
          Generate Video
        </Button>
      </div>
    </div>
  );
}
