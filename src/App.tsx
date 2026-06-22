import React, { Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseProvider } from "./context/SupabaseContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

const Index = React.lazy(() => import("./pages/Index"));
const Login = React.lazy(() => import("./pages/Login"));
const Planejamento = React.lazy(() => import("./pages/Planejamento"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground font-mono text-sm uppercase tracking-widest">Carregando...</div>
  </div>
);

const App = () => (
  <SupabaseProvider>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/planejamento" element={<ProtectedRoute><Planejamento /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </SupabaseProvider>
);

export default App;
