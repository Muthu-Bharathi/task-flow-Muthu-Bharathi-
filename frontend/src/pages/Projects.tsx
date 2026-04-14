import { useState, useEffect } from "react"
import { fetchApi } from "../lib/api"
import Navbar from "../components/Navbar"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { useAuth } from "../contexts/AuthContext"
import { 
  Folder, 
  Target, 
  Zap, 
  TrendingUp, 
  Trash2, 
  Plus, 
  CircleOff,
  ChevronRight
} from "lucide-react"

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createLoading, setCreateLoading] = useState(false)

  const loadProjects = async () => {
    try {
      const data = await fetchApi("/projects")
      setProjects(data.projects || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const { user } = useAuth()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const p = await fetchApi("/projects", {
        method: "POST",
        body: JSON.stringify({ name: createName, description: createDesc })
      })
      setProjects([p, ...projects])
      setShowCreate(false)
      setCreateName("")
      setCreateDesc("")
    } catch (err) {
      console.error(err)
      alert("Failed to create project")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this project? All associated tasks will be permanently removed.")) return
    
    try {
      await fetchApi(`/projects/${id}`, { method: "DELETE" })
      setProjects(projects.filter(p => p.id !== id))
    } catch (err) {
      alert("Failed to delete project")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
               Workspace Dashboard
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Active Projects</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md text-lg leading-relaxed italic">
              "Great things are done by a series of small things brought together."
            </p>
          </div>
          
          <Button 
            onClick={() => setShowCreate(!showCreate)} 
            className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all duration-300 rounded-xl font-semibold flex items-center gap-2"
          >
            {showCreate ? <CircleOff className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? "Cancel Creation" : "Initiate New Project"}
          </Button>
        </div>

        {/* Global Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
           {[
             { label: 'Total Projects', value: projects.length, icon: <Folder className="w-5 h-5 text-blue-500" /> },
             { label: 'Active Goals', value: projects.length * 2 + 3, icon: <Target className="w-5 h-5 text-red-500" /> },
             { label: 'Team Capacity', value: '88%', icon: <Zap className="w-5 h-5 text-amber-500" /> },
             { label: 'Recent Velocity', value: '+12%', icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
           ].map((stat, i) => (
             <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3">{stat.icon}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
             </div>
           ))}
        </div>

        {showCreate && (
          <div className="mb-12 glass p-8 rounded-3xl animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Start a new journey</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Project Workspace Name</Label>
                  <Input 
                    required 
                    className="h-12 bg-white/50 border-slate-200 focus:ring-blue-500"
                    placeholder="e.g. Apollo Missions"
                    value={createName} 
                    onChange={e => setCreateName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Mission Statement (Optional)</Label>
                  <Input 
                     className="h-12 bg-white/50 border-slate-200 focus:ring-blue-500"
                     placeholder="Q4 growth and infrastructure..."
                     value={createDesc} 
                     onChange={e => setCreateDesc(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={createLoading} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                  {createLoading ? "Engineering Workspace..." : "Confirm & Launch"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium animate-pulse">Synchronizing Data...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-w-2xl mx-auto shadow-inner">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
               <Folder className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">No projects on the horizon</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">Your dashboard is looking a bit empty. Ready to start something impactful?</p>
            <Button onClick={() => setShowCreate(true)} className="bg-slate-900">Initiate First Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((p) => (
              <div key={p.id} className="relative group">
                {user?.id === p.owner_id && (
                  <button 
                    onClick={(e) => handleDeleteProject(e, p.id)}
                    className="absolute top-4 right-4 z-20 p-2 bg-white/10 dark:bg-slate-800/50 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md border border-white/20"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Link to={`/projects/${p.id}`} className="block outline-none h-full">
                  <div className="premium-card h-full flex flex-col p-8 group-hover:bg-slate-900 group-focus:ring-2 group-focus:ring-blue-500 relative overflow-hidden group-hover:-translate-y-2 group-hover:rotate-1">
                  
                  {/* Subtle Background Pattern */}
                  <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-[0.02] group-hover:opacity-20 transition-opacity">
                     <svg className="w-24 h-24 text-slate-900 dark:text-white group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>
                     </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="w-12 h-1 bg-blue-500 mb-6 group-hover:w-24 transition-all duration-500 rounded-full" />
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-white transition-colors line-clamp-1 mb-3">
                      {p.name}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 group-hover:text-slate-400 transition-colors line-clamp-2 text-sm leading-relaxed mb-8 flex-1">
                      {p.description || "Building the future of task management, one step at a time."}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 group-hover:border-slate-800 pt-6">
                      <div className="flex -space-x-2">
                         {[1,2,3].map(i => (
                           <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 group-hover:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                             U{i}
                           </div>
                         ))}
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors tracking-widest uppercase flex items-center gap-1">
                        View Mission <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
