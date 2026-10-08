import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './styles/globals.css'
import App from './app/App'
import { analytics } from './features/analytics/analytics'

console.info(String.raw`
                                     /\             /\
                                   /  \___________/  \
                                  /                   \
                                |   .----.   .----.   |
                                |---|####|---|####|---|
                                |   '----'   '----'   |
                                |       .-------.     |
                                  \      |  o o  |    /
                                   '.    '-------'  .'
                                       '-._______.-'

                                        Babitampan

                                      made in Godean
`)

analytics.initialize()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
