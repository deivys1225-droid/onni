import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GuestRoute from "@/components/auth/GuestRoute";
import PrivateRoute from "@/components/auth/PrivateRoute";
import OpAiAssistant from "@/components/OpAiAssistant";
import InicioPage from "./pages/InicioPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import PrivacidadPage from "./pages/PrivacidadPage.tsx";
import TerminosPage from "./pages/TerminosPage.tsx";
import WelcomeUniversePage from "./pages/WelcomeUniversePage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import UpdatePasswordPage from "./pages/UpdatePasswordPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import { CameraBackgroundProvider } from "@/contexts/CameraBackgroundContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CameraBackgroundProvider>
          <OpAiAssistant />
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <InicioPage />
                </PrivateRoute>
              }
            />
            <Route path="/inicio" element={<Navigate to="/" replace />} />
            <Route
              path="/entrar"
              element={
                <GuestRoute>
                  <WelcomeUniversePage />
                </GuestRoute>
              }
            />
            <Route
              path="/registro"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route path="/actualizar-contrasena" element={<UpdatePasswordPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CameraBackgroundProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
