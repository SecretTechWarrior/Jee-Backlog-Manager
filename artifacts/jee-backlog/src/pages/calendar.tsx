import { useState } from "react"
import { useGetCalendarDayDetail } from "@workspace/api-client-react"
import type { CalendarDay } from "@workspace/api-client-react"
import { useQuery } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays, parseISO, differenceInDays } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Info, Calendar as CalendarIcon } from "lucide-react"

// A GitHub-style contribution calendar component
export default function Calendar() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear.toString())
  
  const { data: calendarData, isLoading } = useQuery<CalendarDay[]>({
    queryKey: ['calendar', year],
    queryFn: async () => {
      const params = new URLSearchParams({ year })
      const res = await fetch(`/api/calendar?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })

  // Group data by date for quick lookup
  const dataMap = new Map((calendarData || []).map(d => [d.date, d.count]))

  // Generate 52 weeks of days ending today (or Dec 31 of selected year)
  const endDate = year === currentYear.toString() ? new Date() : new Date(`${year}-12-31`)
  const startDate = subDays(endDate, 364) // 52 weeks * 7 days - 1
  
  const days = []
  for (let i = 0; i < 365; i++) {
    const d = subDays(endDate, 364 - i)
    days.push(format(d, 'yyyy-MM-dd'))
  }

  const getColorClass = (count: number) => {
    if (count === 0) return "bg-muted border border-border/50"
    if (count <= 2) return "bg-emerald-200 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800"
    if (count <= 5) return "bg-emerald-400 dark:bg-emerald-700/60 border border-emerald-500 dark:border-emerald-600"
    if (count <= 8) return "bg-emerald-500 dark:bg-emerald-600 border border-emerald-600 dark:border-emerald-500"
    return "bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-400"
  }

  // Calculate stats
  const totalLectures = calendarData?.reduce((sum, day) => sum + day.count, 0) || 0
  const maxDay = calendarData?.reduce((max, day) => Math.max(max, day.count), 0) || 0
  const activeDays = calendarData?.filter(d => d.count > 0).length || 0

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Your contribution history</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{totalLectures}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total in {year}</div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-full text-blue-500">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{maxDay}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Best Day</div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-full text-orange-500">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeDays}</div>
            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Active Days</div>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm overflow-x-auto">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="min-w-[800px]">
            <div className="flex gap-2 mb-2 text-xs text-muted-foreground">
              <div className="w-8"></div>
              <div className="flex-1 flex justify-between">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="w-8 flex flex-col justify-between text-xs text-muted-foreground py-1">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              
              <div className="flex-1 grid grid-flow-col gap-1.5 auto-cols-max" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
                {days.map((dateStr, i) => {
                  const count = dataMap.get(dateStr) || 0
                  return (
                    <DayCell key={dateStr} date={dateStr} count={count} colorClass={getColorClass(count)} />
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1.5">
                {[0, 1, 4, 7, 10].map((count, i) => (
                  <div key={i} className={`w-3.5 h-3.5 rounded-sm ${getColorClass(count)}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DayCell({ date, count, colorClass }: { date: string, count: number, colorClass: string }) {
  const [open, setOpen] = useState(false)
  const { data: detail, isLoading } = useGetCalendarDayDetail(date, {
    query: { enabled: open, queryKey: ['calendar-detail', date] }
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary ${colorClass}`}
          aria-label={`${count} lectures on ${date}`}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center" side="top">
        <div className="p-4 border-b bg-muted/30">
          <div className="font-semibold text-sm">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {count} {count === 1 ? 'lecture' : 'lectures'} completed
          </div>
        </div>
        
        <div className="p-4 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : !detail || detail.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity on this day.</p>
          ) : (
            <div className="space-y-4">
              {detail.entries.map((entry, i) => (
                <div key={i} className="flex justify-between items-start gap-4 text-sm">
                  <div>
                    <p className="font-medium leading-none">{entry.chapterName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.className} • {entry.subjectName}
                    </p>
                  </div>
                  <div className="font-semibold whitespace-nowrap bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                    +{entry.completed}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
