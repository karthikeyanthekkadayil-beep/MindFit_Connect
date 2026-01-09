import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string | null;
  };
}

interface MessageSearchProps {
  messages: Message[];
  onResultSelect: (messageId: string) => void;
  onClose: () => void;
}

export function MessageSearch({
  messages,
  onResultSelect,
  onClose,
}: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const matchingMessages = messages.filter((msg) =>
      msg.content.toLowerCase().includes(searchQuery)
    );

    setResults(matchingMessages);
    setCurrentIndex(0);

    if (matchingMessages.length > 0) {
      onResultSelect(matchingMessages[0].id);
    }
  }, [query, messages, onResultSelect]);

  const navigateResult = (direction: "prev" | "next") => {
    if (results.length === 0) return;

    let newIndex: number;
    if (direction === "next") {
      newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    }

    setCurrentIndex(newIndex);
    onResultSelect(results[newIndex].id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateResult("next");
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-card border-b px-4 py-2 z-10 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="flex-1 h-8 text-sm"
        />
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} of {results.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateResult("prev")}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateResult("next")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
        {query && results.length === 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            No results
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface HighlightedTextProps {
  text: string;
  highlight: string;
}

export function HighlightedText({ text, highlight }: HighlightedTextProps) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-primary/30 text-inherit rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}
