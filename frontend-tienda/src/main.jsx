import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import VersionWatcher from './components/VersionWatcher.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VersionWatcher />
    <App />
  </StrictMode>,
)