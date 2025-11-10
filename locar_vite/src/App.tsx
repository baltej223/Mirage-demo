import "./App.css";
// import MainScreen from "./components/MainScreen";
import MirageARView from "./components/MirageARView";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute';

import Login from "./components/Login.tsx";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <>
            <MirageARView />
            </>
          </ProtectedRoute>
          } />
      </Routes>
    </>
  );
}

export default App;
