import { useState, useCallback, useRef } from "react";
import { FileData } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadCloud, X } from "lucide-react";

interface UploadStepProps {
  isVisible: boolean;
  onFileChange: (fileData: FileData | null) => void;
  onRemoveFile: () => void;
  onContinue: () => void;
  fileData: FileData | null;
}

export default function UploadStep({ 
  isVisible, 
  onFileChange, 
  onRemoveFile, 
  onContinue, 
  fileData 
}: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    // Check if the file is an image or video
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return;
    }

    const newFileData: FileData = {
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video'
    };
    
    onFileChange(newFileData);
  };
  
  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Upload your photo or video</h2>
      <p className="text-gray-500 text-sm mb-4">For best results, upload a clear, well-lit video or photo of your face.</p>
      
      {!fileData ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
            isDragging ? 'border-primary bg-primary-100' : 'border-gray-300 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <UploadCloud className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">Drag & drop your file here</p>
              <p className="text-sm text-gray-500">or</p>
              <Button type="button">
                Browse Files
              </Button>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*,video/*" 
                onChange={handleFileInputChange}
              />
              <p className="text-xs text-gray-500 mt-2">Accepts JPG, PNG, GIF or MP4, MOV files</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected File</h3>
          <Card className="relative bg-gray-100 rounded-lg overflow-hidden">
            <div className="aspect-video flex items-center justify-center">
              {fileData.type === 'image' ? (
                <img 
                  src={fileData.url} 
                  alt="Preview" 
                  className="max-h-full max-w-full object-contain" 
                />
              ) : (
                <video 
                  src={fileData.url} 
                  className="max-h-full max-w-full object-contain" 
                  controls
                />
              )}
              
              <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                <span>{fileData.name}</span>
              </div>
            </div>
          </Card>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button variant="outline" onClick={onRemoveFile}>
              Remove
            </Button>
            <Button onClick={onContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
