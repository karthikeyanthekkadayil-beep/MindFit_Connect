import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface MoodEntry {
  id: string;
  entry_date: string;
  mood_score: number;
  mood_label: string;
  stress_level: number | null;
  notes: string | null;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  mood: number;
  stress: number | null;
  moodLabel: string;
}

interface MoodStressChartProps {
  userId: string;
  onMoodLogged?: () => void;
}

const MOOD_EMOJIS: Record<number, { emoji: string; label: string; color: string }> = {
  5: { emoji: '😊', label: 'Great', color: 'hsl(142, 76%, 36%)' },
  4: { emoji: '🙂', label: 'Good', color: 'hsl(142, 60%, 45%)' },
  3: { emoji: '😐', label: 'Okay', color: 'hsl(45, 93%, 47%)' },
  2: { emoji: '😔', label: 'Low', color: 'hsl(25, 95%, 53%)' },
  1: { emoji: '😢', label: 'Tough', color: 'hsl(0, 84%, 60%)' },
};

export const MoodStressChart = ({ userId, onMoodLogged }: MoodStressChartProps) => {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedStress, setSelectedStress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMoodHistory();
  }, [userId, timeRange]);

  const fetchMoodHistory = async () => {
    setLoading(true);
    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('mood_stress_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      setEntries(data || []);
      
      // Check for today's entry
      const todayData = data?.find(e => e.entry_date === today);
      setTodayEntry(todayData || null);
      if (todayData) {
        setSelectedMood(todayData.mood_score);
        setSelectedStress(todayData.stress_level);
      }

      // Transform data for chart - fill in missing dates with null
      const chartPoints: ChartDataPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const entry = data?.find(e => e.entry_date === date);
        chartPoints.push({
          date,
          displayDate: format(parseISO(date), 'MMM d'),
          mood: entry?.mood_score || 0,
          stress: entry?.stress_level || null,
          moodLabel: entry?.mood_label || '',
        });
      }
      setChartData(chartPoints);

    } catch (error) {
      console.error('Error fetching mood history:', error);
      toast.error('Failed to load mood history');
    } finally {
      setLoading(false);
    }
  };

  const saveMoodEntry = async () => {
    if (!selectedMood) {
      toast.error('Please select a mood');
      return;
    }

    setSaving(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const moodLabel = MOOD_EMOJIS[selectedMood]?.label || 'Unknown';

    try {
      if (todayEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('mood_stress_entries')
          .update({
            mood_score: selectedMood,
            mood_label: moodLabel,
            stress_level: selectedStress,
            updated_at: new Date().toISOString(),
          })
          .eq('id', todayEntry.id);

        if (error) throw error;
        toast.success('Mood updated!');
      } else {
        // Create new entry
        const { error } = await supabase
          .from('mood_stress_entries')
          .insert({
            user_id: userId,
            entry_date: today,
            mood_score: selectedMood,
            mood_label: moodLabel,
            stress_level: selectedStress,
          });

        if (error) throw error;
        toast.success('Mood logged!');
      }

      fetchMoodHistory();
      onMoodLogged?.();
    } catch (error) {
      console.error('Error saving mood:', error);
      toast.error('Failed to save mood entry');
    } finally {
      setSaving(false);
    }
  };

  // Calculate trends
  const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    if (recent.length === 0 || older.length === 0) return 'stable';
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const diff = recentAvg - olderAvg;
    if (Math.abs(diff) < 0.3) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const moodValues = entries.map(e => e.mood_score).filter(v => v > 0);
  const stressValues = entries.map(e => e.stress_level).filter((v): v is number => v !== null);
  
  const moodTrend = calculateTrend(moodValues);
  const stressTrend = calculateTrend(stressValues);
  const avgMood = moodValues.length ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1) : '-';
  const avgStress = stressValues.length ? (stressValues.reduce((a, b) => a + b, 0) / stressValues.length).toFixed(1) : '-';

  const TrendIcon = ({ trend, inverse = false }: { trend: 'up' | 'down' | 'stable'; inverse?: boolean }) => {
    const isPositive = inverse ? trend === 'down' : trend === 'up';
    const isNegative = inverse ? trend === 'up' : trend === 'down';
    
    if (trend === 'stable') return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (isPositive) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const moodValue = payload.find((p: any) => p.dataKey === 'mood')?.value;
      const stressValue = payload.find((p: any) => p.dataKey === 'stress')?.value;
      const moodInfo = moodValue ? MOOD_EMOJIS[moodValue] : null;

      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{label}</p>
          {moodInfo && (
            <p className="text-sm flex items-center gap-2 mt-1">
              <span>{moodInfo.emoji}</span>
              <span>Mood: {moodInfo.label}</span>
            </p>
          )}
          {stressValue && (
            <p className="text-sm mt-1">
              Stress: {stressValue}/10
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today's Entry */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Log Today's Mood
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {todayEntry ? 'Update your entry for today' : 'How are you feeling today?'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
          {/* Mood Selection */}
          <div>
            <p className="text-xs sm:text-sm font-medium mb-2">Mood</p>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(MOOD_EMOJIS).reverse().map(([score, info]) => (
                <button
                  key={score}
                  className={`p-2 sm:p-3 rounded-lg border text-center transition-all ${
                    selectedMood === Number(score)
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedMood(Number(score))}
                >
                  <span className="text-xl sm:text-2xl">{info.emoji}</span>
                  <p className="text-[10px] sm:text-xs mt-1">{info.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Stress Level */}
          <div>
            <p className="text-xs sm:text-sm font-medium mb-2">Stress Level (Optional)</p>
            <div className="flex gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <button
                  key={level}
                  className={`flex-1 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    selectedStress === level
                      ? 'ring-2 ring-primary'
                      : ''
                  } ${
                    level <= 3 ? 'bg-green-500/10 hover:bg-green-500/20 text-green-600' : 
                    level <= 6 ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600' : 
                    'bg-red-500/10 hover:bg-red-500/20 text-red-600'
                  }`}
                  onClick={() => setSelectedStress(level)}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2">
              <span>Low stress</span>
              <span>High stress</span>
            </div>
          </div>

          <Button 
            onClick={saveMoodEntry} 
            disabled={saving || !selectedMood}
            className="w-full"
          >
            {saving ? 'Saving...' : todayEntry ? 'Update Entry' : 'Log Mood'}
          </Button>
        </CardContent>
      </Card>

      {/* Trends Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg. Mood</p>
                <p className="text-xl sm:text-2xl font-bold">{avgMood}</p>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon trend={moodTrend} />
                <span className="text-xs text-muted-foreground">
                  {moodTrend === 'up' ? 'Improving' : moodTrend === 'down' ? 'Declining' : 'Stable'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg. Stress</p>
                <p className="text-xl sm:text-2xl font-bold">{avgStress}</p>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon trend={stressTrend} inverse />
                <span className="text-xs text-muted-foreground">
                  {stressTrend === 'down' ? 'Improving' : stressTrend === 'up' ? 'Increasing' : 'Stable'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Wellness Trends
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track your mental wellness over time</CardDescription>
            </div>
            <div className="flex gap-1">
              {(['7d', '14d', '30d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setTimeRange(range)}
                >
                  {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <Tabs defaultValue="combined" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8 mb-4">
              <TabsTrigger value="combined" className="text-xs">Combined</TabsTrigger>
              <TabsTrigger value="mood" className="text-xs">Mood</TabsTrigger>
              <TabsTrigger value="stress" className="text-xs">Stress</TabsTrigger>
            </TabsList>

            <TabsContent value="combined">
              <div className="h-[200px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      yAxisId="mood"
                      domain={[0, 5]}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--primary))"
                      label={{ value: 'Mood', angle: -90, position: 'insideLeft', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="stress"
                      orientation="right"
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--secondary))"
                      label={{ value: 'Stress', angle: 90, position: 'insideRight', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      yAxisId="mood"
                      type="monotone"
                      dataKey="mood"
                      name="Mood"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      connectNulls
                    />
                    <Line
                      yAxisId="stress"
                      type="monotone"
                      dataKey="stress"
                      name="Stress"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="mood">
              <div className="h-[200px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[0, 5]}
                      tick={{ fontSize: 10 }}
                      ticks={[1, 2, 3, 4, 5]}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="mood"
                      name="Mood"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-3">
                {Object.entries(MOOD_EMOJIS).reverse().map(([score, info]) => (
                  <div key={score} className="text-center">
                    <span className="text-lg">{info.emoji}</span>
                    <p className="text-[10px] text-muted-foreground">{score}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stress">
              <div className="h-[200px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}/10`, 'Stress Level']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <defs>
                      <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="stress"
                      name="Stress"
                      stroke="hsl(var(--secondary))"
                      fill="url(#stressGradient)"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-3 px-4">
                <span className="text-green-500">Low (1-3)</span>
                <span className="text-yellow-500">Moderate (4-6)</span>
                <span className="text-red-500">High (7-10)</span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-lg">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2">
              {entries.slice(-5).reverse().map((entry) => {
                const moodInfo = MOOD_EMOJIS[entry.mood_score];
                return (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{moodInfo?.emoji}</span>
                      <div>
                        <p className="text-xs sm:text-sm font-medium">
                          {format(parseISO(entry.entry_date), 'EEEE, MMM d')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {moodInfo?.label} • Stress: {entry.stress_level || 'N/A'}/10
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
