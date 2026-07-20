import { Link, useLocation } from "wouter"
import { useGetClasses } from "@workspace/api-client-react"
import { Home, History, CalendarDays, BarChart2, Settings, BookOpen, Menu, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { GlobalSearch } from "./global-search"
import { useState } from "react"
import { useUndoLastAction } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const MAIN_NAV = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "History", href: "/history", icon: History },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Statistics", href: "/statistics", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const { data: classes } = useGetClasses()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mutate: undo } = useUndoLastAction()
  const { toast } = useToast()

  const handleUndo = () => {
    undo(undefined, {
      onSuccess: (res) => {
        if (res.success) {
          toast({ title: "Undo successful", description: res.message })
        } else {
          toast({ title: "Undo failed", description: res.message, variant: "destructive" })
        }
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    })
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-4 md:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-sidebar-primary rounded-md flex items-center justify-center text-sidebar-primary-foreground shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">JEE Backlog</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <GlobalSearch />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1 mb-8">
          {MAIN_NAV.map((item) => {
            const isActive = location === item.href
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
              )} onClick={() => setMobileOpen(false)}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {classes?.map((cls) => (
          <div key={cls.id} className="mb-6">
            <h4 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3">
              {cls.name}
            </h4>
            <div className="space-y-1">
              {cls.subjects.map((sub) => {
                const href = `/class/${cls.id}/subject/${sub.id}`
                const isActive = location === href
                return (
                  <Link key={sub.id} href={href} className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
                  )} onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 opacity-70" />
                      <span>{sub.name}</span>
                    </div>
                    {sub.remainingLectures > 0 && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 min-w-[20px] flex items-center justify-center">
                        {sub.remainingLectures}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-20">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="font-semibold">JEE Backlog</span>
          </div>
          <GlobalSearch mobile />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
