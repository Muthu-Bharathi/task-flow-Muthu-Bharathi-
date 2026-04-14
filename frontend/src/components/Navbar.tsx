import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { Button } from "./ui/button"
import { Moon, Sun, LogOut } from "lucide-react"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <nav className="nav-blur px-6 py-4 flex items-center justify-between">
      <Link to="/projects" className="flex items-center gap-2 group">
        <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
           <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
           </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:opacity-80 transition-opacity">
          TaskFlow
        </span>
      </Link>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Toggle Theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">Account</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { logout(); navigate("/login") }}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
