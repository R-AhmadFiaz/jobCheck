import { useState, type ReactNode } from "react"
import {
  LayoutDashboardIcon, BriefcaseIcon, BookOpenIcon, UserIcon, SettingsIcon,
  ShieldCheckIcon, SunIcon, MoonIcon, BellIcon, MenuIcon, XIcon, LogOutIcon,
  BarChartIcon, DatabaseIcon, ChevronRightIcon, ZapIcon,
} from "./ui"
import type { Page } from "./ui"
import { Avatar, Dropdown, MoreVerticalIcon } from "./ui"

interface NavItem {
  id: Page
  label: string
  icon: ReactNode
}

const userNavItems: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",     icon: <LayoutDashboardIcon size={18} /> },
  { id: "analyze",    label: "Analyze Job",   icon: <ZapIcon size={18} /> },
  { id: "results",    label: "Last Analysis", icon: <ShieldCheckIcon size={18} /> },
  { id: "knowledge",  label: "Knowledge Base",icon: <BookOpenIcon size={18} /> },
  { id: "profile",    label: "Profile",       icon: <UserIcon size={18} /> },
]

const adminNavItems: NavItem[] = [
  { id: "dashboard",  label: "Overview",      icon: <LayoutDashboardIcon size={18} /> },
  { id: "admin",      label: "Rule Manager",  icon: <DatabaseIcon size={18} /> },
  { id: "knowledge",  label: "Knowledge Base",icon: <BookOpenIcon size={18} /> },
  { id: "profile",    label: "Account",       icon: <UserIcon size={18} /> },
]

interface LayoutProps {
  page: Page
  onNavigate: (p: Page) => void
  dark: boolean
  onToggleDark: () => void
  children: ReactNode
  isAdmin?: boolean
}

export default function Layout({ page, onNavigate, dark, onToggleDark, children, isAdmin }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = isAdmin ? adminNavItems : userNavItems

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)] flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm">
          <ShieldCheckIcon size={16} className="text-white" />
        </div>
        <span className="font-bold text-[var(--foreground)] text-lg" style={{ fontFamily: "var(--font-display)" }}>
          JobCheck
        </span>
        {isAdmin && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--primary)] text-white">
            Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false) }}
              className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${active
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
            >
              <span className={active ? "text-white" : ""}>{item.icon}</span>
              {item.label}
              {active && <ChevronRightIcon size={14} className="ml-auto opacity-70" />}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--muted)] transition-colors cursor-pointer group">
          <Avatar name="Alex Morgan" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)] truncate">Alex Morgan</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">alex@example.com</p>
          </div>
          <Dropdown
            trigger={
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[var(--border)] transition-all text-[var(--muted-foreground)]">
                <MoreVerticalIcon size={14} />
              </button>
            }
            items={[
              { label: "Profile", icon: <UserIcon size={14} />, onClick: () => onNavigate("profile") },
              { label: "Settings", icon: <SettingsIcon size={14} />, onClick: () => onNavigate("profile") },
              { label: "Sign out", icon: <LogOutIcon size={14} />, onClick: () => onNavigate("landing"), danger: true },
            ]}
          />
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[var(--card)] border-r border-[var(--border)] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--card)] flex flex-col border-r border-[var(--border)] animate-slide-right">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-16 px-6 bg-[var(--card)] border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
            >
              <MenuIcon size={18} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-base font-semibold text-[var(--foreground)]">
                {navItems.find(n => n.id === page)?.label ?? "JobCheck"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigate.bind(null, "analyze")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 transition-all"
            >
              <ZapIcon size={13} />
              Analyze
            </button>

            <button className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <BellIcon size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger)]" />
            </button>

            <button
              onClick={onToggleDark}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            <button
              onClick={() => onNavigate("landing")}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
