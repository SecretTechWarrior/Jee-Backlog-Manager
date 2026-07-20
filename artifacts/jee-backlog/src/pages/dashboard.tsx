import { useGetDashboard, useGetClasses } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Target, CheckCircle2, Flame, Calendar, Clock, BookOpen } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboard()
  const { data: classes, isLoading: classesLoading } = useGetClasses()

  if (statsLoading || classesLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!stats || !classes) return null

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {stats.lastActivity ? `Last active ${formatDateTime(stats.lastActivity)}` : "Welcome back."}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-card border rounded-lg px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground leading-tight">Streak</span>
              <span className="font-bold leading-tight">{stats.currentStreak} days</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Lectures</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRemaining}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {stats.pendingChapters} pending chapters</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of {stats.totalLectures} total</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Keep the momentum going</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Lectures finished this week</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>You have completed {stats.overallPercentage.toFixed(1)}% of your JEE syllabus</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>{stats.totalCompleted} / {stats.totalLectures} Lectures</span>
              <span>{stats.overallPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={stats.overallPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classes.map(cls => (
          <Card key={cls.id} className="flex flex-col h-full">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {cls.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-border">
                {cls.subjects.map(sub => {
                  const percent = sub.totalLectures > 0 ? (sub.completedLectures / sub.totalLectures) * 100 : 0;
                  return (
                    <div key={sub.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{sub.name}</span>
                        <div className="text-right">
                          <span className="font-bold">{sub.remainingLectures}</span>
                          <span className="text-sm text-muted-foreground"> left</span>
                        </div>
                      </div>
                      <div className="space-y-1 mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percent.toFixed(1)}%</span>
                          <span>{sub.completedLectures} / {sub.totalLectures}</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
