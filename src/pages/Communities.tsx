import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreateCommunityDialog } from "@/components/CreateCommunityDialog";
import { BottomNav } from "@/components/BottomNav";
import { CommunityCardSkeleton } from "@/components/skeletons";
import { useUserRole } from "@/hooks/useUserRole";
import { MotionFadeIn, MotionList, MotionItem, MotionSection } from "@/components/motion/MotionWrappers";
import { motion } from "framer-motion";

export default function Communities() {
  const navigate = useNavigate();
  const { isModOrAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: communities, isLoading } = useQuery({
    queryKey: ["communities", searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("communities")
        .select("*")
        .order("member_count", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const creatorIds = [...new Set(data?.map(c => c.creator_id) || [])];
      const { data: profiles } = await supabase
        .rpc("get_public_profiles_info", { profile_ids: creatorIds });
      
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      
      return data?.map(community => ({
        ...community,
        creator: profileMap.get(community.creator_id)
      }));
    },
  });

  const { data: myCommunities } = useQuery({
    queryKey: ["my-communities"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("community_members")
        .select("community:communities(*)")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(item => item.community);
    },
  });

  const categories = [
    { value: "fitness", label: "Fitness" },
    { value: "nutrition", label: "Nutrition" },
    { value: "mental_health", label: "Mental Health" },
    { value: "social", label: "Social" },
    { value: "outdoor", label: "Outdoor" },
    { value: "other", label: "Other" },
  ];

  const CommunityCard = ({ community }: { community: any }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
      onClick={() => navigate(`/communities/${community.id}`)}
    >
      {community.image_url && (
        <div className="h-20 sm:h-32 overflow-hidden rounded-t-lg">
          <img
            src={community.image_url}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="p-2.5 sm:p-4 pb-1.5 sm:pb-2">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs sm:text-base font-semibold truncate">{community.name}</CardTitle>
            <CardDescription className="line-clamp-2 text-[10px] sm:text-sm mt-0.5">
              {community.description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2 py-0.5">{community.category}</Badge>
        </div>
      </CardHeader>
      <CardFooter className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground p-2.5 pt-0 sm:p-4 sm:pt-0">
        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
        <span>{community.member_count || 0} members</span>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <MotionFadeIn className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">Communities</h1>
            <p className="text-muted-foreground text-xs sm:text-base truncate">Connect with like-minded fitness enthusiasts</p>
          </div>
          {isModOrAdmin && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-1 sm:gap-2 shrink-0 h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          )}
        </MotionFadeIn>

        <MotionFadeIn delay={0.1} className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 sm:h-11"
          />
        </MotionFadeIn>

        <MotionFadeIn delay={0.15}>
          <Tabs defaultValue="discover" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
              <TabsTrigger value="discover" className="text-xs sm:text-sm">Discover</TabsTrigger>
              <TabsTrigger value="my-communities" className="text-xs sm:text-sm">My Communities</TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="space-y-4">
              <MotionList className="flex gap-1.5 sm:gap-2 flex-wrap" delay={0.2}>
                <MotionItem>
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    All
                  </Button>
                </MotionItem>
                {categories.map((category) => (
                  <MotionItem key={category.value}>
                    <Button
                      variant={selectedCategory === category.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.value)}
                      className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      {category.label}
                    </Button>
                  </MotionItem>
                ))}
              </MotionList>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CommunityCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <MotionList className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4" delay={0.1}>
                  {communities?.map((community) => (
                    <MotionItem key={community.id}>
                      <CommunityCard community={community} />
                    </MotionItem>
                  ))}
                </MotionList>
              )}
            </TabsContent>

            <TabsContent value="my-communities" className="space-y-3 sm:space-y-4">
              {myCommunities && myCommunities.length > 0 ? (
                <MotionList className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {myCommunities.map((community) => (
                    <MotionItem key={community.id}>
                      <CommunityCard community={community} />
                    </MotionItem>
                  ))}
                </MotionList>
              ) : (
                <MotionFadeIn className="text-center py-8 sm:py-12">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No communities yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Join a community to connect with others
                  </p>
                  <Button onClick={() => {
                    const discoverTab = document.querySelector('[value="discover"]') as HTMLElement;
                    discoverTab?.click();
                  }}>
                    Discover Communities
                  </Button>
                </MotionFadeIn>
              )}
            </TabsContent>
          </Tabs>
        </MotionFadeIn>

        <CreateCommunityDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </div>

      <BottomNav />
    </div>
  );
}
