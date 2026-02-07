import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const StatsCardSkeleton = () => (
  <Card>
    <CardContent className="p-2.5 sm:p-4">
      <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
      <Skeleton className="h-5 sm:h-7 w-12 sm:w-16 mb-1" />
      <Skeleton className="h-3 w-10 sm:w-14" />
    </CardContent>
  </Card>
);

export const CommunityCardSkeleton = () => (
  <Card>
    <Skeleton className="h-20 sm:h-32 rounded-t-lg" />
    <CardHeader className="p-2.5 sm:p-4 pb-1.5 sm:pb-2">
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3 sm:h-5 w-3/4" />
          <Skeleton className="h-2 sm:h-4 w-full" />
          <Skeleton className="h-2 sm:h-4 w-2/3" />
        </div>
        <Skeleton className="h-4 sm:h-5 w-12 sm:w-16" />
      </div>
    </CardHeader>
    <CardContent className="p-2.5 pt-0 sm:p-4 sm:pt-0">
      <Skeleton className="h-3 sm:h-4 w-20" />
    </CardContent>
  </Card>
);

export const EventCardSkeleton = () => (
  <Card>
    <Skeleton className="h-20 sm:h-36 rounded-t-lg" />
    <CardHeader className="p-2.5 sm:p-4 pb-1 sm:pb-2">
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3 sm:h-5 w-3/4" />
          <Skeleton className="h-2 sm:h-4 w-full" />
        </div>
        <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
      </div>
    </CardHeader>
    <CardContent className="space-y-1 sm:space-y-1.5 p-2.5 pt-0 sm:p-4 sm:pt-0">
      <Skeleton className="h-2.5 sm:h-4 w-24" />
      <Skeleton className="h-2.5 sm:h-4 w-32" />
      <Skeleton className="h-2.5 sm:h-4 w-16" />
    </CardContent>
  </Card>
);

export const ActivityCardSkeleton = () => (
  <div className="flex items-start gap-2 p-2.5 sm:p-4 rounded-xl border">
    <Skeleton className="h-5 w-5 rounded" />
    <div className="flex-1 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3 sm:h-4 w-3/4" />
      </div>
      <Skeleton className="h-2 sm:h-3 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-2 sm:h-3 w-10" />
        <Skeleton className="h-2 sm:h-3 w-8" />
        <Skeleton className="h-2 sm:h-3 w-12" />
      </div>
    </div>
  </div>
);

export const RecipeCardSkeleton = () => (
  <Card>
    <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
      <div className="flex justify-between items-start gap-1">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3 sm:h-5 w-3/4" />
          <Skeleton className="h-2 sm:h-4 w-full hidden sm:block" />
        </div>
      </div>
      <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-2">
        <Skeleton className="h-4 sm:h-5 w-12 sm:w-16" />
        <Skeleton className="h-4 sm:h-5 w-12 sm:w-16" />
      </div>
    </CardHeader>
    <CardContent className="p-2 sm:p-4 pt-0">
      <div className="grid grid-cols-2 gap-0.5 sm:gap-2">
        <Skeleton className="h-3 sm:h-4 w-12" />
        <Skeleton className="h-3 sm:h-4 w-12" />
        <Skeleton className="h-3 sm:h-4 w-12 hidden sm:block" />
        <Skeleton className="h-3 sm:h-4 w-14" />
      </div>
    </CardContent>
  </Card>
);

export const MeditationCardSkeleton = () => (
  <Card>
    <CardHeader className="p-2.5 sm:p-4 pb-1.5 sm:pb-2">
      <div className="flex justify-between items-start gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
        <Skeleton className="h-3 sm:h-5 w-3/4" />
        <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
      </div>
      <Skeleton className="h-2 sm:h-4 w-full" />
      <Skeleton className="h-2 sm:h-4 w-2/3" />
    </CardHeader>
    <CardContent className="p-2.5 sm:p-4 pt-0 space-y-1.5 sm:space-y-2">
      <div className="flex gap-2 sm:gap-4">
        <Skeleton className="h-3 sm:h-4 w-12" />
        <Skeleton className="h-3 sm:h-4 w-16" />
      </div>
      <Skeleton className="h-8 sm:h-10 w-full" />
    </CardContent>
  </Card>
);

export const GoalCardSkeleton = () => (
  <Card>
    <CardHeader className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 sm:h-5 w-3/4" />
          <Skeleton className="h-3 sm:h-4 w-full" />
        </div>
        <Skeleton className="h-5 sm:h-6 w-14 sm:w-16" />
      </div>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
      <Skeleton className="h-2 w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </CardContent>
  </Card>
);

export const ChartSkeleton = ({ height = "200px" }: { height?: string }) => (
  <Card>
    <CardHeader className="p-4 sm:p-6">
      <Skeleton className="h-4 sm:h-6 w-48" />
      <Skeleton className="h-3 sm:h-4 w-64 mt-1" />
    </CardHeader>
    <CardContent className="p-2 sm:p-6 pt-0">
      <Skeleton className={`w-full`} style={{ height }} />
    </CardContent>
  </Card>
);

export const DashboardCardSkeleton = () => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4 flex items-center gap-4">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-5 rounded" />
    </CardContent>
  </Card>
);
