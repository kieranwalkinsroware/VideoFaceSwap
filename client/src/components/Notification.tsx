import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { NotificationType } from "@/types";

interface NotificationProps {
  isVisible: boolean;
  type: NotificationType;
  message: string;
}

export default function Notification({ isVisible, type, message }: NotificationProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
    } else {
      const timer = setTimeout(() => {
        setIsShowing(false);
      }, 300); // transition duration

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!message || (!isVisible && !isShowing)) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-600 text-white";
      case "error":
        return "bg-red-500 text-white";
      default:
        return "bg-primary text-white";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 mr-2" />;
      case "error":
        return <AlertCircle className="h-4 w-4 mr-2" />;
      default:
        return <Info className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg transform transition-all duration-300 ${
        getTypeStyles()
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
    >
      <div className="flex items-center">
        {getIcon()}
        <span>{message}</span>
      </div>
    </div>
  );
}
