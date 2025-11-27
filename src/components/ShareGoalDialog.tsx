import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, Globe, Lock } from "lucide-react";

interface ShareGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  currentIsPublic: boolean;
}

interface Community {
  id: string;
  name: string;
}

export const ShareGoalDialog = ({ open, onOpenChange, goalId, currentIsPublic }: ShareGoalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [shareType, setShareType] = useState(currentIsPublic ? 'public' : 'private');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchUserCommunities();
      fetchExistingShares();
    }
  }, [open]);

  const fetchUserCommunities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('community_members')
        .select('community_id, communities(id, name)')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const communityList = data
        ?.map(m => m.communities)
        .filter(Boolean)
        .map(c => ({ id: c.id, name: c.name })) || [];

      setCommunities(communityList);
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const fetchExistingShares = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_shares')
        .select('*')
        .eq('goal_id', goalId);

      if (error) throw error;

      const communityShares = data
        ?.filter(s => s.shared_with_type === 'community')
        .map(s => s.shared_with_id)
        .filter(Boolean) || [];

      setSelectedCommunities(communityShares);
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update goal public status
      const { error: updateError } = await supabase
        .from('user_goals')
        .update({ is_public: shareType === 'public' })
        .eq('id', goalId);

      if (updateError) throw updateError;

      // Delete existing community shares
      const { error: deleteError } = await supabase
        .from('goal_shares')
        .delete()
        .eq('goal_id', goalId)
        .eq('shared_with_type', 'community');

      if (deleteError) throw deleteError;

      // Add new community shares if not private
      if (shareType === 'communities' && selectedCommunities.length > 0) {
        const shares = selectedCommunities.map(communityId => ({
          goal_id: goalId,
          shared_with_type: 'community',
          shared_with_id: communityId
        }));

        const { error: insertError } = await supabase
          .from('goal_shares')
          .insert(shares);

        if (insertError) throw insertError;
      }

      toast.success('Sharing settings updated!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating sharing settings:', error);
      toast.error('Failed to update sharing settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Your Goal</DialogTitle>
          <DialogDescription>
            Choose who can see your goal for accountability and support
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={shareType} onValueChange={setShareType}>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Private</span>
                </div>
                <p className="text-sm text-muted-foreground">Only you can see this goal</p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="communities" id="communities" />
              <Label htmlFor="communities" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Share with Communities</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which communities can see your goal
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Public</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Anyone can discover and support your goal
                </p>
              </Label>
            </div>
          </RadioGroup>

          {shareType === 'communities' && communities.length > 0 && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <Label className="text-sm font-semibold">Select Communities</Label>
              <div className="space-y-2">
                {communities.map(community => (
                  <div key={community.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={community.id}
                      checked={selectedCommunities.includes(community.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCommunities([...selectedCommunities, community.id]);
                        } else {
                          setSelectedCommunities(selectedCommunities.filter(id => id !== community.id));
                        }
                      }}
                    />
                    <Label htmlFor={community.id} className="text-sm cursor-pointer">
                      {community.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shareType === 'communities' && communities.length === 0 && (
            <div className="text-sm text-muted-foreground text-center p-4 bg-muted/50 rounded-lg">
              You haven't joined any communities yet. Join communities to share your goals!
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
