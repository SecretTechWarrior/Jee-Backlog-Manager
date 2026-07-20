import { useGetStatistics } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { ChevronRight } from "lucide-react"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Statistics() {
  const { data: stats, isLoading } = useGetStatistics()

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const pieData = [
    { name: 'Completed', value: stats.overallCompletion },
    { name: 'Remaining', value: 100 - stats.overallCompletion }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border shadow-md p-3 rounded-md text-sm">
          <p className="font-medium text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
              {entry.name.includes('ercentage') || entry.name === 'value' ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into your progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Completion */}
        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>Overall Completion</CardTitle>
            <CardDescription>Total syllabus coverage</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold">{stats.overallCompletion.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Done</span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Lectures completed over the last 7 weeks</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weeklyProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  name="Lectures"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))" }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Completion */}
        <Card className="hover-elevate lg:col-span-2">
          <CardHeader>
            <CardTitle>Subject Progress</CardTitle>
            <CardDescription>Percentage completed per subject</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.subjectCompletion} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="subjectName" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="percentage" 
                  name="Completion %"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  {stats.subjectCompletion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Pending */}
        <Card>
          <CardHeader>
            <CardTitle>Most Pending Chapters</CardTitle>
            <CardDescription>Chapters holding you back the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topPendingChapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending chapters!</p>
              ) : (
                stats.topPendingChapters.map(chapter => (
                  <Link 
                    key={chapter.id} 
                    href={`/class/${chapter.classId}/subject/${chapter.subjectId}`}
                    className="flex items-center justify-between group p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col overflow-hidden mr-4">
                      <span className="font-medium truncate text-sm">{chapter.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {chapter.className} • {chapter.subjectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20">
                        {chapter.remainingLectures} left
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recently Completed */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Finished</CardTitle>
            <CardDescription>Chapters you fully completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentlyCompletedChapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No completed chapters yet.</p>
              ) : (
                stats.recentlyCompletedChapters.map(chapter => (
                  <Link 
                    key={chapter.id} 
                    href={`/class/${chapter.classId}/subject/${chapter.subjectId}`}
                    className="flex items-center justify-between group p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col overflow-hidden mr-4">
                      <span className="font-medium truncate text-sm line-through text-muted-foreground">{chapter.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {chapter.className} • {chapter.subjectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="success">Done</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
