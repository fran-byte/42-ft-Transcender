import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Terms from "./pages/Terms";
import Game from "./pages/Game";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Lobby from "./pages/Lobby";
import Privacy from "./pages/Privacy";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        }
      />

      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;