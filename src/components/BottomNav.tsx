'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

const NAV = [
  { href: '/',        icon: '🏠', label: 'Home'    },
  { href: '/binder',  icon: '📦', label: 'Binder'  },
  { href: '/stack',   icon: '💰', label: 'Stack'   },
  { href: '/scan',    icon: '📸', label: 'Scan'    },
  { href: '/settings',icon: '⚙️', label: 'Settings'},
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="bottom-nav">
      {NAV.map(n => (
        <Link key={n.href} href={n.href} className={`nav-item${path === n.href ? ' active' : ''}`}>
          <motion.span
            className="nav-icon"
            whileTap={{ scale: 0.8 }}
            animate={path === n.href ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {n.icon}
          </motion.span>
          <span>{n.label}</span>
        </Link>
      ))}
    </nav>
  )
}
