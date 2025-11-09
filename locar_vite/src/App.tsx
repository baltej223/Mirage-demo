import "./App.css";
import Login from "./components/Login";
import MainScreen from "./components/MainScreen";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainScreen />
          </ProtectedRoute>
          } />
      </Routes>
    </>
  );
}

export default App;
