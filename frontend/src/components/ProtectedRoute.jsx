import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const username = localStorage.getItem("username");
  const email = localStorage.getItem("email");

  if (!username || !email) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;