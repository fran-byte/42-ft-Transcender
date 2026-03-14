import { Routes, Route } from "react-router-dom";
import "./styles/App.css";

import Home from "./pages/Home";
import Terms from "./pages/Terms";
import Game from "./pages/Game";

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  );
}

export default App;