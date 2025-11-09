import React,{useEffect,useState} from 'react'
export default function ThemeToggle(){const [d,set]=useState(document.documentElement.classList.contains('dark'));useEffect(()=>{document.documentElement.classList.toggle('dark',d);localStorage.setItem('theme',d?'dark':'light')},[d]);return <button className='btn btn-secondary' onClick={()=>set(v=>!v)}>{d?'🌙 Dark':'☀️ Light'}</button>}
