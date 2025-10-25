"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../app/components/Sidebar";
import Header from "./components/Header";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Proteção de rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("login");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen font-sans bg-gray-50">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header titulo="Bem vindo ao sistema de Reservas de Laboratórios" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* <header className="p-4 bg-white md:hidden flex items-center shadow-sm sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-blue-700 hover:text-blue-900 transition-colors"
          >
            ☰
          </button>
          <h1 className="ml-4 font-bold text-lg text-gray-700">
            Sistema de Reservas
          </h1>
        </header> */}

        {/* Conteúdo principal */}
        <main className="flex-1 p-8 flex flex-col gap-6">
          <h1 className="text-3xl font-bold text-gray-700">
            Bem-vindo ao sistema
          </h1>
          <p className="text-gray-600">
            Aqui você pode gerenciar usuários e outras funcionalidades do sistema.
          </p>

          <button
            onClick={handleLogout}
            className="w-32 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </main>
      </div>
    </div>
  );
}
