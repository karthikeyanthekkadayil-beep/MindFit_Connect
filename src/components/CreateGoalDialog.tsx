import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateGoalDialog = ({ open, onOpenChange, onSuccess }: CreateGoalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    goal_type: 'fitness',
    title: '',
    description: '',
    target_value: '',
    unit: '',
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    priority: 'medium',
    is_public: false
  });

  const goalTypePresets = {
    fitness: { unit: 'workouts', title: 'Complete Workouts', description: 'Track your fitness activity completion' },
    meditation: { unit: 'minutes', title: 'Meditation Time', description: 'Daily meditation practice goal' },
    nutrition: { unit: 'meals', title: 'Healthy Meals', description: 'Follow your meal plan' },
    community: { unit: 'interactions', title: 'Community Engagement', description: 'Stay active in communities' },
    custom: { unit: '', title: '', description: '' }
  };

  const handleGoalTypeChange = (type: string) => {
    const preset = goalTypePresets[type as keyof typeof goalTypePresets];
    setFormData({
      ...formData,
      goal_type: type,
      unit: preset.unit,
      title: preset.title,
      description: preset.description
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.target_value || !formData.unit || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('user_goals')
        .insert({
          user_id: session.user.id,
          goal_type: formData.goal_type,
          title: formData.title,
          description: formData.description,
          target_value: parseFloat(formData.target_value),
          unit: formData.unit,
          end_date: formData.end_date,
          priority: formData.priority,
          is_public: formData.is_public
        });

      if (error) throw error;

      toast.success('Goal created successfully!');
      setFormData({
        goal_type: 'fitness',
        title: '',
        description: '',
        target_value: '',
        unit: '',
        end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        priority: 'medium',
        is_public: false
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Set a target and track your progress towards achieving it
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal_type">Goal Category</Label>
              <Select value={formData.goal_type} onValueChange={handleGoalTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fitness">💪 Fitness</SelectItem>
                  <SelectItem value="meditation">🧘 Meditation</SelectItem>
                  <SelectItem value="nutrition">🍎 Nutrition</SelectItem>
                  <SelectItem value="community">👥 Community</SelectItem>
                  <SelectItem value="custom">🎯 Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete 20 workouts"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What do you want to achieve?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_value">Target Value *</Label>
                <Input
                  id="target_value"
                  type="number"
                  min="1"
                  step="any"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="workouts"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
