import { createContext, useContext, useReducer, useMemo } from "react";
import PropTypes from "prop-types";

const Custom = createContext(null);
Custom.displayName = "CustomContext";

function reducer(state, { type, value }) {
  if (type !== "MINI_SIDENAV") throw new Error(`Unhandled action type: ${type}`);
  return state.miniSidenav === value ? state : { miniSidenav: value };
}

function CustomControllerProvider({ children }) {
  const [controller, dispatch] = useReducer(reducer, { miniSidenav: false });
  const value = useMemo(() => [controller, dispatch], [controller]);
  return <Custom.Provider value={value}>{children}</Custom.Provider>;
}

CustomControllerProvider.propTypes = { children: PropTypes.node.isRequired };

function useCustomController() {
  const context = useContext(Custom);
  if (!context) {
    throw new Error("useCustomController should be used inside the CustomControllerProvider.");
  }
  return context;
}

const setMiniSidenav = (dispatch, value) => dispatch({ type: "MINI_SIDENAV", value });

export { CustomControllerProvider, useCustomController, setMiniSidenav };
