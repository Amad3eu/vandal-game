import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { watchTouchUi } from './touchUi'
import './index.css'
import './styles/ui.css'

watchTouchUi()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
