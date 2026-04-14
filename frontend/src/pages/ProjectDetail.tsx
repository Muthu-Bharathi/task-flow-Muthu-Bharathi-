import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { fetchApi } from "../lib/api"
import Navbar from "../components/Navbar"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { useAuth } from "../contexts/AuthContext"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { 
  ChevronLeft, 
  Plus, 
  Calendar, 
  Package, 
  Trash2
} from "lucide-react"

type TaskStatus = 'todo' | 'in_progress' | 'done'
type TaskPriority = 'low' | 'medium' | 'high'

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<any[]>([])

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  // Form states
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [dueDate, setDueDate] = useState("")
  const [assigneeId, setAssigneeId] = useState("")

  const loadProject = async () => {
    try {
      const data = await fetchApi(`/projects/${id}`)
      setProject(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const users = await fetchApi('/auth/users')
      setAllUsers(users)
    } catch (err) {
      console.error("Failed to load users", err)
    }
  }

  useEffect(() => {
    loadProject()
    loadUsers()

    // Real-time updates via SSE
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000"
    const eventSource = new EventSource(`${apiUrl}/events`)
    
    eventSource.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.project_id !== id) return

      setProject((prev: any) => {
        if (!prev) return prev
        const tasks = prev.tasks || []

        switch (msg.type) {
          case "task_created":
            if (tasks.find((t: any) => t.id === msg.data.id)) return prev
            return { ...prev, tasks: [...tasks, msg.data] }
          case "task_updated":
            return { ...prev, tasks: tasks.map((t: any) => t.id === msg.data.id ? msg.data : t) }
          case "task_deleted":
            return { ...prev, tasks: tasks.filter((t: any) => t.id !== msg.data) }
          default:
            return prev
        }
      })
    }

    return () => eventSource.close()
  }, [id])

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as TaskStatus

    // Optimistic Update
    const updatedTasks = project.tasks.map((t: any) => 
      t.id === draggableId ? { ...t, status: newStatus } : t
    )
    setProject({ ...project, tasks: updatedTasks })

    try {
      await fetchApi(`/tasks/${draggableId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      })
    } catch (err) {
      console.error("Failed to sync drag and drop", err)
      loadProject() // Rollback
    }
  }

  // Get unique assignees from tasks for filter dropdown
  const uniqueAssignees = project?.tasks 
    ? Array.from(new Set(project.tasks.filter((t: any) => t.assignee_id).map((t: any) => JSON.stringify({id: t.assignee_id, name: t.assignee_name}))))
      .map((s: any) => JSON.parse(s))
    : []

  const filteredTasks = project?.tasks?.filter((t: any) => {
    const statusMatch = statusFilter === 'all' || t.status === statusFilter
    const assigneeMatch = assigneeFilter === 'all' || (assigneeFilter === 'unassigned' ? !t.assignee_id : t.assignee_id === assigneeFilter)
    return statusMatch && assigneeMatch
  }) || []

  const openNewTask = () => {
    setEditingTask(null)
    setTitle("")
    setDesc("")
    setPriority("medium")
    setStatus("todo")
    setDueDate("")
    setAssigneeId("")
    setShowTaskForm(true)
  }

  const openEditTask = (task: any) => {
    setEditingTask(task)
    setTitle(task.title)
    setDesc(task.description || "")
    setPriority(task.priority)
    setStatus(task.status)
    setDueDate(task.due_date ? task.due_date.split('T')[0] : "")
    setAssigneeId(task.assignee_id || "")
    setShowTaskForm(true)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body = {
        title,
        description: desc,
        priority,
        status,
        due_date: dueDate || null,
        assignee_id: assigneeId || null
      }
      
      if (editingTask) {
        // Optimistic UI for update
        const updatedTasks = project.tasks.map((t: any) => t.id === editingTask.id ? { ...t, ...body } : t)
        setProject({ ...project, tasks: updatedTasks })

        try {
          await fetchApi(`/tasks/${editingTask.id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
          })
        } catch(e) {
          alert("Failed to update task")
          loadProject()
        }
      } else {
        const newTask = await fetchApi(`/projects/${id}/tasks`, {
          method: "POST",
          body: JSON.stringify(body)
        })
        setProject({ ...project, tasks: [...(project.tasks || []), newTask] })
      }
      setShowTaskForm(false)
    } catch (err) {
      console.error(err)
      alert(editingTask ? "Error updating" : "Error creating")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure?")) return
    try {
      await fetchApi(`/tasks/${taskId}`, { method: "DELETE" })
      setProject({ ...project, tasks: project.tasks.filter((t: any) => t.id !== taskId) })
      if (editingTask?.id === taskId) setShowTaskForm(false)
    } catch (err) {
      alert("Failed to delete task")
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">Preparing Workspace...</p>
    </div>
  )
  if (!project) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Workplace not found</div>

  const isOwner = project.owner_id === user?.id

  const columns: { id: TaskStatus, title: string, color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'slate' },
    { id: 'in_progress', title: 'In Progress', color: 'blue' },
    { id: 'done', title: 'Completed', color: 'emerald' }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      <Navbar />
      
      <div className="max-w-[1600px] mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
        
        {/* Header section */}
        <div className="mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
          <div className="space-y-4">
            <Link to="/projects" className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
               <ChevronLeft className="w-4 h-4" />
               Back to Dashboard
            </Link>
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{project.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg">{project.description || "No project briefing provided."}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             {/* Filter Bar Inline */}
             <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">View:</span>
                <select 
                  className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Full Board</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">Active</option>
                  <option value="done">Done</option>
                </select>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                <select 
                  className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer max-w-[120px]"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="all">Everyone</option>
                  <option value="unassigned">Unassigned</option>
                  {uniqueAssignees.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
             </div>
             
             {isOwner && (
               <Button onClick={openNewTask} className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all rounded-xl font-bold flex items-center gap-2">
                 <Plus className="w-4 h-4" />
                 New Task
               </Button>
             )}
          </div>
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-col lg:flex-row gap-8 items-stretch h-full min-h-[70vh]">
            {columns.filter(col => statusFilter === 'all' || col.id === statusFilter).map(col => {
              const tasks = filteredTasks.filter((t: any) => t.status === col.id)
              return (
                <div key={col.id} className="flex-1 flex flex-col min-w-[320px] max-w-full lg:max-w-md">
                  <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.id === 'todo' ? 'bg-slate-400' : col.id === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg tracking-tight uppercase">{col.title}</h3>
                      <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400">{tasks.length}</span>
                    </div>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 space-y-4 min-h-[400px] transition-colors rounded-2xl ${snapshot.isDraggingOver ? 'bg-slate-100/50 dark:bg-slate-800/50' : ''}`}
                      >
                        {tasks.map((task: any, index: number) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openEditTask(task)}
                                className={`premium-card p-6 cursor-pointer group hover:border-blue-500 transition-all duration-300 transform ${snapshot.isDragging ? '-rotate-2 scale-105 shadow-2xl ring-2 ring-blue-500/20' : 'hover:-translate-y-1'}`}
                              >
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start gap-4">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-600 transition-colors">{task.title}</h4>
                                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${task.priority === 'high' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                  </div>
                                  
                                  {task.description && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed italic">{task.description}</p>
                                  )}
                                  
                                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex flex-col gap-1">
                                      {task.assignee_name ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                                            {task.assignee_name.charAt(0)}
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{task.assignee_name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 italic">No Assignee</span>
                                      )}
                                      {task.creator_name && (
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium px-1">By {task.creator_name}</span>
                                      )}
                                    </div>

                                    {task.due_date && (
                                       <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-400">
                                         <Calendar className="w-3 h-3" />
                                         <span className="text-[10px] font-bold uppercase tracking-tighter">
                                           {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                         </span>
                                       </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {tasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-2 group transition-colors">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-200 dark:text-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                              <Package className="w-6 h-6" />
                            </div>
                            <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">Empty Workspace</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Modern Slide-over Form Overlay */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowTaskForm(false)} />
          
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-500 ease-out p-10">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{editingTask ? "Update Briefing" : "New Task Briefing"}</h2>
              <button onClick={() => setShowTaskForm(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto space-y-8 pr-4">
              <div className="space-y-2">
                <Label className="uppercase text-xs font-extrabold text-slate-400 tracking-widest">Task Title</Label>
                <Input required className="h-14 text-lg font-semibold bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 transition-all dark:text-white" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs font-extrabold text-slate-400 tracking-widest">Description & Context</Label>
                <textarea 
                  className="w-full min-h-[160px] p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 outline-none text-sm leading-relaxed transition-all dark:text-slate-200"
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  placeholder="Provide detailed instructions or constraints..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="uppercase text-xs font-extrabold text-slate-400 tracking-widest">Target Status</Label>
                  <select
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent outline-none font-bold text-blue-600 focus:bg-white dark:focus:bg-slate-700 transition-all"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">Active</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase text-xs font-extrabold text-slate-400 tracking-widest">Strategic Priority</Label>
                   <select
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent outline-none font-bold focus:bg-white dark:focus:bg-slate-700 transition-all dark:text-slate-200"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Standard</option>
                    <option value="high">Critical Path</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs font-extrabold text-slate-400 tracking-widest">Project Assignee</Label>
                <select
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent outline-none font-bold focus:bg-white dark:focus:bg-slate-700 transition-all dark:text-white"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Search & Select Member...</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id} className="dark:bg-slate-900">
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs font-extrabold text-slate-400 tracking-widest">Deadline Date</Label>
                <Input type="date" className="h-12 bg-slate-50 border-transparent font-bold" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="pt-10 flex gap-4 pb-12">
                {(isOwner || !editingTask || editingTask.creator_id === user?.id || editingTask.assignee_id === user?.id) ? (
                  <Button type="submit" className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-lg shadow-2xl transition-all rounded-2xl">
                    {editingTask ? "Save Briefing" : "Launch Task"}
                  </Button>
                ) : (
                  <div className="flex-1 h-14 flex items-center justify-center bg-slate-100 text-slate-400 font-bold rounded-2xl cursor-not-allowed">
                    View Only
                  </div>
                )}
                {editingTask && (isOwner || String(editingTask.creator_id) === String(user?.id)) && (
                   <Button type="button" variant="ghost" onClick={() => handleDeleteTask(editingTask.id)} className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-2xl flex items-center justify-center">
                     <Trash2 className="w-5 h-5" />
                   </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
