import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface CreateChatPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentUserId: string;
}

export const CreateChatPollDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
}: CreateChatPollDialogProps) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const queryClient = useQueryClient();

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter((o) => o.trim() !== "");
      if (validOptions.length < 2) throw new Error("Need at least 2 options");
      if (!question.trim()) throw new Error("Question is required");

      const { error } = await supabase.from("chat_polls").insert({
        conversation_id: conversationId,
        user_id: currentUserId,
        question: question.trim(),
        options: validOptions.map((o) => o.trim()),
        is_multiple_choice: isMultipleChoice,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-polls", conversationId] });
      toast.success("Poll created!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setIsMultipleChoice(false);
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Create Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              placeholder="What do you want to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="gap-1 w-full"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="chat-multiple-choice">Allow multiple selections</Label>
            <Switch
              id="chat-multiple-choice"
              checked={isMultipleChoice}
              onCheckedChange={setIsMultipleChoice}
            />
          </div>

          <Button
            onClick={() => createPollMutation.mutate()}
            disabled={
              createPollMutation.isPending ||
              !question.trim() ||
              options.filter((o) => o.trim()).length < 2
            }
            className="w-full"
          >
            {createPollMutation.isPending ? "Creating..." : "Create Poll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
