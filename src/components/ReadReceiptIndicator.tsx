import { Check, CheckCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface ReadReceipt {
  userId: string;
  userName: string;
  readAt: string;
}

interface ReadReceiptIndicatorProps {
  messageCreatedAt: string;
  isOwnMessage: boolean;
  readReceipts: ReadReceipt[];
  conversationType: "direct" | "group";
}

export function ReadReceiptIndicator({
  messageCreatedAt,
  isOwnMessage,
  readReceipts,
  conversationType,
}: ReadReceiptIndicatorProps) {
  // Only show read receipts for own messages
  if (!isOwnMessage) return null;

  const messageTime = new Date(messageCreatedAt).getTime();
  const readers = readReceipts.filter(
    (r) => new Date(r.readAt).getTime() >= messageTime
  );

  if (readers.length === 0) {
    // Message sent but not read
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Sent</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Message has been read
  if (conversationType === "direct") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              Seen {format(new Date(readers[0].readAt), "MMM d, h:mm a")}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Group chat - show who has read
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCheck className="h-3.5 w-3.5 text-primary" />
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="text-xs space-y-1">
            <p className="font-medium">Seen by:</p>
            {readers.map((reader) => (
              <p key={reader.userId}>
                {reader.userName} • {format(new Date(reader.readAt), "h:mm a")}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
