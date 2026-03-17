import { NavLink } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        <NavLink to="/" className="navbar__brand">
          <ShieldCheck size={22} />
          <span>Deepfake Shield</span>
        </NavLink>
        <div className="navbar__nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
          >
            Detect
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
          >
            Dashboard
          </NavLink>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="navbar__link"
          >
            API Docs
          </a>
        </div>
      </div>
    </nav>
  )
}
