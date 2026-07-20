import { useState, useRef } from "react"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Download, Upload, Trash2, Moon, Sun, Monitor } from "lucide-react"
import { exportData, useImportData, useResetDatabase } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  
  const [isExporting, setIsExporting] = useState(false)
  const { mutate: importData, isPending: isImporting } = useImportData()
  const { mutate: resetDb, isPending: isResetting } = useResetDatabase()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resetConfirmation, setResetConfirmation] = useState("")

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jee-backlog-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "Export successful", description: "Your data has been downloaded." })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed"
      toast({ title: "Export failed", description: msg, variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        importData({ data: json }, {
          onSuccess: (res) => {
            if (res.success) {
              toast({ title: "Import successful", description: res.message })
              setTimeout(() => window.location.reload(), 1500)
            } else {
              toast({ title: "Import failed", description: res.message, variant: "destructive" })
            }
          },
          onError: (err) => {
            toast({ title: "Import failed", description: err.message, variant: "destructive" })
          }
        })
      } catch (err) {
        toast({ title: "Invalid file", description: "The selected file is not a valid JSON backup.", variant: "destructive" })
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    if (resetConfirmation !== "RESET DATABASE") return
    
    resetDb(undefined, {
      onSuccess: (res) => {
        if (res.success) {
          toast({ title: "Database reset", description: res.message })
          setResetConfirmation("")
          setTimeout(() => window.location.reload(), 1500)
        } else {
          toast({ title: "Reset failed", description: res.message, variant: "destructive" })
        }
      },
      onError: (err) => {
        toast({ title: "Reset failed", description: err.message, variant: "destructive" })
      }
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your app preferences and data</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the application looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">Select your preferred color scheme</p>
              </div>
              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Sun className="h-4 w-4" /> Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Moon className="h-4 w-4" /> Dark
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'system' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Monitor className="h-4 w-4" /> System
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your data or restore from a backup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Export Database</Label>
                <p className="text-sm text-muted-foreground">Download a complete JSON backup of your progress</p>
              </div>
              <Button onClick={handleExport} disabled={isExporting} className="shrink-0">
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export JSON"}
              </Button>
            </div>

            <div className="border-t pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Import Database</Label>
                <p className="text-sm text-muted-foreground">Restore your data from a previous JSON backup</p>
                <p className="text-xs text-destructive mt-1 font-medium">Warning: This will overwrite your current data.</p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="shrink-0" disabled={isImporting}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? "Importing..." : "Import JSON"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will completely replace your current database with the contents of the backup file. 
                      You cannot undo this action unless you export your current data first.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                      Select File & Import
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json,application/json" 
                className="hidden" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect your entire account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Reset Entire Database</Label>
                <p className="text-sm text-muted-foreground">Deletes all chapters, history, and progress permanently.</p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0" disabled={isResetting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Factory Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Reset entire database?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your chapters, progress, and history. 
                      This action <strong>cannot</strong> be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <div className="py-4 space-y-4">
                    <p className="text-sm font-medium">
                      Please type <span className="font-mono bg-muted px-1.5 py-0.5 rounded select-all">RESET DATABASE</span> to confirm.
                    </p>
                    <Input 
                      value={resetConfirmation}
                      onChange={(e) => setResetConfirmation(e.target.value)}
                      placeholder="RESET DATABASE"
                      className="font-mono"
                    />
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setResetConfirmation("")}>Cancel</AlertDialogCancel>
                    <Button 
                      variant="destructive" 
                      onClick={handleReset}
                      disabled={resetConfirmation !== "RESET DATABASE" || isResetting}
                    >
                      {isResetting ? "Resetting..." : "Delete Everything"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
