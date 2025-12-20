import { initialize } from './tauri_axum'

initialize('')

// Import the components
import './components/button'
import './components/lucide-icon'
import './components/a2ui'

// Import the pages
import './views/errors/not-found'
import './views/errors/not-in-browser'
import './views/home/home.component'

// Import application routes
import './layouts/root-layout'
import './routes'
