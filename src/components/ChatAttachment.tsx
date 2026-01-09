import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Image, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatAttachmentProps {
  currentUserId: string;
  onAttachmentReady: (attachment: {
    url: string;
    type: string;
    name: string;
  } | null) => void;
  pendingAttachment: {
    url: string;
    type: string;
    name: string;
  } | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function ChatAttachment({
  currentUserId,
  onAttachmentReady,
  pendingAttachment,
}: ChatAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("File type not supported");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 10MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(fileName);

      const attachmentType = ALLOWED_IMAGE_TYPES.includes(file.type) ? "image" : "file";

      onAttachmentReady({
        url: publicUrl,
        type: attachmentType,
        name: file.name,
      });

      toast.success("File uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = () => {
    onAttachmentReady(null);
  };

  return (
    <div className="flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_FILE_TYPES.join(",")}
        onChange={handleFileSelect}
      />

      {pendingAttachment ? (
        <div className="relative">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 mr-2">
            {pendingAttachment.type === "image" ? (
              <Image className="h-4 w-4 text-primary" />
            ) : (
              <FileText className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm text-foreground truncate max-w-[120px]">
              {pendingAttachment.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleRemoveAttachment}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>
      )}
    </div>
  );
}

interface MessageAttachmentPreviewProps {
  url: string;
  type: string;
  name: string;
  isOwnMessage: boolean;
}

export function MessageAttachmentPreview({
  url,
  type,
  name,
  isOwnMessage,
}: MessageAttachmentPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (type === "image" && !imageError) {
    return (
      <div className="mb-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {!imageLoaded && (
            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={url}
            alt={name}
            className={`max-w-48 max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity ${
              imageLoaded ? "block" : "hidden"
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mb-2 p-2 rounded-lg transition-colors ${
        isOwnMessage
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
          : "bg-background/50 hover:bg-background/80"
      }`}
    >
      <FileText className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm truncate max-w-[180px]">{name}</span>
    </a>
  );
}
