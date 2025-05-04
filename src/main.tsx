import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Box, MantineProvider, Text } from '@mantine/core'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
    <App />
    </MantineProvider>
  </StrictMode>,
)
