import { useApp } from './store'
import HomeScreen from './components/HomeScreen'
import CreateFlow from './components/CreateFlow'
import GeneratingScreen from './components/GeneratingScreen'
import PreviewScreen from './components/PreviewScreen'
import FlyoverScreen from './components/FlyoverScreen'
import WalkScreen from './components/WalkScreen'
import DoneScreen from './components/DoneScreen'
import SavedScreen from './components/SavedScreen'
import WalksScreen from './components/WalksScreen'

export default function App() {
  const screen = useApp((s) => s.screen)
  return (
    <div className="app">
      {screen === 'home' && <HomeScreen />}
      {screen === 'create' && <CreateFlow />}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'preview' && <PreviewScreen />}
      {screen === 'flyover' && <FlyoverScreen />}
      {screen === 'walk' && <WalkScreen />}
      {screen === 'done' && <DoneScreen />}
      {screen === 'saved' && <SavedScreen />}
      {screen === 'walks' && <WalksScreen />}
    </div>
  )
}
