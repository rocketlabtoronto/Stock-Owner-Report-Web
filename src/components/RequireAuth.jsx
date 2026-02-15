import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import PropTypes from "prop-types";

export default function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
};
