import { useState, useEffect } from "react"
import type { Page } from "./components/ui"
import { ToastContainer } from "./components/ui"
import Layout from "./components/Layout"
import Landing from "./pages/Landing"
import Auth from "./pages/Auth"
import Dashboard from "./pages/Dashboard"
import Analyze from "./pages/Analyze"
import Results from "./pages/Results"
import KnowledgeBase from "./pages/KnowledgeBase"
import Admin from "./pages/Admin"
import Profile from "./pages/Profile"

export default function App() {
  const [page, setPage] = useState<Page>("landing")
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  const toggleDark = () => setDark(d => !d)

  const navigate = (p: Page) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const appPages: Page[] = ["dashboard", "analyze", "results", "knowledge", "admin", "profile"]
  const isAppPage = appPages.includes(page)
  const isAdminPage = page === "admin"

  if (page === "landing") {
    return (
      <>
        <Landing onNavigate={navigate} dark={dark} onToggleDark={toggleDark} />
        <ToastContainer />
      </>
    )
  }

  if (page === "login") {
    return (
      <>
        <Auth mode="login" onNavigate={navigate} />
        <ToastContainer />
      </>
    )
  }

  if (page === "register") {
    return (
      <>
        <Auth mode="register" onNavigate={navigate} />
        <ToastContainer />
      </>
    )
  }

  if (isAppPage) {
    return (
      <>
        <Layout
          page={page}
          onNavigate={navigate}
          dark={dark}
          onToggleDark={toggleDark}
          isAdmin={isAdminPage}
        >
          <div className="animate-fade-in" key={page}>
            {page === "dashboard" && <Dashboard onNavigate={navigate} />}
            {page === "analyze"   && <Analyze   onNavigate={navigate} />}
            {page === "results"   && <Results   onNavigate={navigate} />}
            {page === "knowledge" && <KnowledgeBase onNavigate={navigate} />}
            {page === "admin"     && <Admin />}
            {page === "profile"   && <Profile   onNavigate={navigate} />}
          </div>
        </Layout>
        <ToastContainer />
      </>
    )
  }

  return null
}
