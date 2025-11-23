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

export default function Communities() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: communities, isLoading } = useQuery({
    queryKey: ["communities", searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("communities")
        .select("*, creator:profiles!communities_creator_id_fkey(full_name, avatar_url)")
        .order("member_count", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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

  const categories = ["Fitness", "Running", "Yoga", "Cycling", "Hiking", "Sports", "Wellness"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Communities</h1>
            <p className="text-muted-foreground">Connect with like-minded fitness enthusiasts</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-communities">My Communities</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading communities...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {communities?.map((community) => (
                  <Card
                    key={community.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/communities/${community.id}`)}
                  >
                    {community.image_url && (
                      <div className="h-32 overflow-hidden rounded-t-lg">
                        <img
                          src={community.image_url}
                          alt={community.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{community.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {community.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{community.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{community.member_count || 0} members</span>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-communities" className="space-y-4">
            {myCommunities && myCommunities.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {myCommunities.map((community) => (
                  <Card
                    key={community.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/communities/${community.id}`)}
                  >
                    {community.image_url && (
                      <div className="h-32 overflow-hidden rounded-t-lg">
                        <img
                          src={community.image_url}
                          alt={community.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{community.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {community.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{community.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{community.member_count || 0} members</span>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No communities yet</h3>
                <p className="text-muted-foreground mb-4">
                  Join a community to connect with others
                </p>
                <Button onClick={() => {
                  const discoverTab = document.querySelector('[value="discover"]') as HTMLElement;
                  discoverTab?.click();
                }}>
                  Discover Communities
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateCommunityDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </div>
    </div>
  );
}
