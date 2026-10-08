import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './styles/globals.css'
import App from './app/App'

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

 ____       _     ____    ___   _____      _     __  __   ____       _     _   _ 
| __ )     / \   | __ )  |_ _| |_   _|    / \   |  \/  | |  _ \     / \   | \ | |
|  _ \    / _ \  |  _ \   | |    | |     / _ \  | |\/| | | |_) |   / _ \  |  \| |
| |_) |  / ___ \ | |_) |  | |    | |    / ___ \ | |  | | |  __/   / ___ \ | |\  |
|____/  /_/   \_\ |____/  |___|   |_|   /_/   \_\ |_|  |_| |_|     /_/   \_\ |_| \_|
                                     Babitampan

                                   made in Godean
`)

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
