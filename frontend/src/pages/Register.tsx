import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { fetchApi } from "../lib/api"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { AlertCircle, ChevronRight, ChevronLeft } from "lucide-react"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      })
      login(data.token, data.user)
      navigate("/projects")
    } catch (err: any) {
      if (err.error === "validation failed") {
        const valErrors = Object.entries(err.fields).map(([k, v]) => `${k} ${v}`).join(", ")
        setError(valErrors)
      } else {
        setError(err.error || "Registration failed")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden relative font-['Outfit']">
      
      {/* Background Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />

      {/* Decorative Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center p-12 overflow-hidden shadow-2xl">
         <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
               <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                     <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
               </defs>
               <rect width="100" height="100" fill="url(#grid)" />
            </svg>
         </div>

         <div className="relative z-10 flex flex-col items-center max-w-lg space-y-12 text-center animate-in fade-in slide-in-from-left duration-1000">
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] group hover:rotate-6 transition-transform">
               <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354l1.107 3.18h3.338l-2.697 2.01 1.03 3.181L12 10.715l-2.778 2.01 1.03-3.182-2.697-2.01h3.338L12 4.354z" />
               </svg>
            </div>
            
            <div className="space-y-6">
               <h2 className="text-5xl font-black text-white leading-tight tracking-tighter">
                  Join the <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">New Standard</span> in Tasking
               </h2>
               <p className="text-slate-400 text-xl font-medium leading-relaxed italic">
                  "Your workspace defines your productivity. Start your journey with the best."
               </p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-3xl w-full">
               <div className="flex justify-between items-center mb-6">
                  <div className="h-2 w-24 bg-emerald-500/40 rounded-full" />
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="h-2 w-full bg-white/10 rounded-full" />
                  <div className="h-2 w-full bg-white/10 rounded-full" />
                  <div className="h-2 w-2/3 bg-white/10 rounded-full" />
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 flex flex-col p-8 lg:p-24 relative z-10 lg:ml-[50%]">
        <div className="mb-auto">
           <Link to="/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs uppercase tracking-widest">
              <ChevronLeft className="w-4 h-4" />
              Back
           </Link>
        </div>
        <div className="w-full max-w-sm space-y-12 my-auto">
          
          <div className="space-y-4 text-center lg:text-left">
             <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
               New Account Initialization
             </div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Join Today</h1>
             <p className="text-slate-500 font-medium text-lg leading-snug">Create your executive agent profile to access your first projects.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-2xl border border-red-100 font-bold animate-in shake duration-500 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              <div className="group space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 group-focus-within:text-emerald-600 transition-colors">Agent Real Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="h-14 px-6 bg-white border-slate-200 focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 rounded-2xl transition-all font-semibold text-slate-900"
                  placeholder="e.g. Commander Shepard"
                />
              </div>
              <div className="group space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 group-focus-within:text-emerald-600 transition-colors">Strategic Email</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="h-14 px-6 bg-white border-slate-200 focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 rounded-2xl transition-all font-semibold"
                  placeholder="commander@taskflow.io"
                />
              </div>
              <div className="group space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 group-focus-within:text-emerald-600 transition-colors">Create Access Code</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="h-14 px-6 bg-white border-slate-200 focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 rounded-2xl transition-all font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-15 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-[0_15px_30px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl flex items-center justify-center gap-2" disabled={loading}>
              {loading ? "Registering Agent..." : "Establish Profile"}
              {!loading && <ChevronRight className="w-5 h-5" />}
            </Button>
            
            <div className="text-sm text-center font-bold text-slate-400 pt-6">
              Already have credentials? <Link to="/login" className="text-emerald-600 hover:text-emerald-700 transition-colors">Login to Command Center</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
