import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
const saved=localStorage.getItem('theme');const prefers=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;if(saved==='dark'||(!saved&&prefers)){document.documentElement.classList.add('dark')}createRoot(document.getElementById('root')).render(<App />)
