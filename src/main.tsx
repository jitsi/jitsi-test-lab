import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Starting React application')
console.log('main.tsx: App component imported:', App)

const rootElement = document.getElementById('root')
console.log('main.tsx: Root element found:', rootElement)

if (!rootElement) {
  console.error('main.tsx: Root element not found!')
} else {
  console.log('main.tsx: Creating React root and rendering app')
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('main.tsx: React app rendered')
}
