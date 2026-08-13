import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';
import Login from './pages/Login';
import RestablecerPassword from './pages/RestablecerPassword';
import Dashboard from './pages/Dashboard';
import Arbitros from './pages/Arbitros';
import Campeonatos from './pages/Campeonatos';
import Tarifas from './pages/Tarifas';
import Encuentros from './pages/Encuentros';
import Designaciones from './pages/Designaciones';
import MisDesignaciones from './pages/MisDesignaciones';
import Adelantos from './pages/Adelantos';
import Liquidaciones from './pages/Liquidaciones';
import LiquidacionDetalle from './pages/LiquidacionDetalle';
import MisFinanzas from './pages/MisFinanzas';
import Disponibilidad from './pages/Disponibilidad';
import DesignacionGeneral from './pages/DesignacionGeneral';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />

          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/arbitros"
              element={
                <RutaProtegida rolesPermitidos={['administrador', 'directivo']}>
                  <Arbitros />
                </RutaProtegida>
              }
            />
            <Route
              path="/campeonatos"
              element={
                <RutaProtegida rolesPermitidos={['administrador']}>
                  <Campeonatos />
                </RutaProtegida>
              }
            />
            <Route
              path="/tarifas"
              element={
                <RutaProtegida rolesPermitidos={['administrador']}>
                  <Tarifas />
                </RutaProtegida>
              }
            />
            <Route
              path="/encuentros"
              element={
                <RutaProtegida rolesPermitidos={['administrador', 'directivo']}>
                  <Encuentros />
                </RutaProtegida>
              }
            />
            <Route
              path="/designaciones"
              element={
                <RutaProtegida rolesPermitidos={['administrador', 'directivo']}>
                  <Designaciones />
                </RutaProtegida>
              }
            />
            <Route
              path="/adelantos"
              element={
                <RutaProtegida rolesPermitidos={['administrador']}>
                  <Adelantos />
                </RutaProtegida>
              }
            />
            <Route
              path="/liquidaciones"
              element={
                <RutaProtegida rolesPermitidos={['administrador']}>
                  <Liquidaciones />
                </RutaProtegida>
              }
            />
            <Route
              path="/liquidaciones/:id"
              element={
                <RutaProtegida rolesPermitidos={['administrador', 'arbitro']}>
                  <LiquidacionDetalle />
                </RutaProtegida>
              }
            />
            <Route
              path="/mis-designaciones"
              element={
                <RutaProtegida rolesPermitidos={['arbitro']}>
                  <MisDesignaciones />
                </RutaProtegida>
              }
            />
            <Route
              path="/mis-finanzas"
              element={
                <RutaProtegida rolesPermitidos={['arbitro']}>
                  <MisFinanzas />
                </RutaProtegida>
              }
            />
            <Route
              path="/designacion-general"
              element={
                <RutaProtegida rolesPermitidos={['administrador', 'directivo', 'arbitro']}>
                  <DesignacionGeneral />
                </RutaProtegida>
              }
            />
            <Route
              path="/mi-disponibilidad"
              element={
                <RutaProtegida rolesPermitidos={['arbitro']}>
                  <Disponibilidad />
                </RutaProtegida>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
