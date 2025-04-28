import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Plus, Share2, Check } from "lucide-react";

interface ResultStepProps {
  isVisible: boolean;
  videoUrl: string;
  prompt: string;
  onCreateNew: () => void;
}

export default function ResultStep({ 
  isVisible, 
  videoUrl,
  prompt, 
  onCreateNew 
}: ResultStepProps) {
  if (!isVisible) return null;

  const handleDownload = () => {
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'ai-generated-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My AI-generated video',
          text: 'Check out this AI video I created!',
          url: videoUrl
        });
      } else {
        // Copy URL to clipboard as fallback
        await navigator.clipboard.writeText(videoUrl);
        alert('Video URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white">
          <Check className="h-6 w-6" />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-foreground text-center">Your AI video is ready!</h2>
      <p className="text-gray-500 text-sm mb-6 text-center">Here's your personalized AI-generated video.</p>
      
      <Card className="overflow-hidden border border-gray-200 bg-black">
        <div className="aspect-video">
          {videoUrl ? (
            <video className="w-full h-full" controls>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              Video not available
            </div>
          )}
        </div>
      </Card>
      
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Prompt used:</h3>
        <p className="text-sm text-gray-600">{prompt}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
        <Button className="w-full sm:w-auto" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Video
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
        <Button className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600" onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" /> Create New Video
        </Button>
      </div>
    </div>
  );
}
