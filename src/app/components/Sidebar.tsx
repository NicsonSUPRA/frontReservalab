// components/Sidebar.tsx
"use client"

import { useState } from "react"
import { FaUser, FaHome, FaDesktop } from "react-icons/fa"
import { IoIosArrowDown } from "react-icons/io"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

interface SidebarProps {
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const [submenuUserOpen, setSubmenuUserOpen] = useState(false)
    const [submenuLabOpen, setSubmenuLabOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    return (
        <aside
            className={`fixed top-0 left-0 h-screen bg-white shadow-xl w-64 p-5 transform transition-transform duration-300 ease-in-out z-50
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
      md:translate-x-0 md:static md:block md:rounded-none rounded-r-2xl`}
        >
            {/* Topo mobile */}
            <div className="flex justify-between items-center mb-8 md:hidden z-50">
                <h2 className="font-bold text-xl text-blue-700 flex items-center gap-2">
                    <FaHome className="text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => router.push("/")} />
                    Menu
                </h2>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-600 hover:text-blue-700 transition-colors">
                    ×
                </button>
            </div>

            {/* Topo desktop */}
            <div className="hidden md:flex items-center gap-2 mb-6 z-50">
                <FaHome className="text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => router.push("/")} />
                <h2 className="font-bold text-xl text-blue-700">Menu</h2>
            </div>

            <ul className="space-y-3">
                {/* Usuários */}
                <li>
                    <button
                        onClick={() => setSubmenuUserOpen(!submenuUserOpen)}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-blue-200 shadow-sm
            bg-white text-gray-700 hover:bg-blue-600 hover:text-white hover:shadow-md
            transition-all duration-200 font-semibold group"
                    >
                        <span className="flex items-center gap-3">
                            <FaUser className="text-blue-600 group-hover:text-white transition-colors duration-200" />
                            Usuários
                        </span>
                        <IoIosArrowDown
                            className={`text-blue-600 group-hover:text-white transition-transform duration-300 ${submenuUserOpen ? "rotate-180" : "rotate-0"
                                }`}
                        />
                    </button>

                    <div
                        className={`grid transition-all duration-300 ease-in-out ${submenuUserOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                            }`}
                    >
                        <ul className="overflow-hidden ml-10 space-y-2">
                            <li>
                                <Link
                                    href="/usuarios/pesquisar"
                                    onClick={() => setSidebarOpen(false)}
                                    className={`block px-3 py-2 rounded-md transition-colors ${pathname === "/usuarios/pesquisar"
                                            ? "bg-blue-600 text-white shadow"
                                            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                                        }`}
                                >
                                    Pesquisar
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/usuarios/cadastrar"
                                    onClick={() => setSidebarOpen(false)}
                                    className={`block px-3 py-2 rounded-md transition-colors ${pathname === "/usuarios/cadastrar"
                                            ? "bg-blue-600 text-white shadow"
                                            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                                        }`}
                                >
                                    Cadastrar
                                </Link>
                            </li>
                        </ul>
                    </div>
                </li>

                {/* Laboratórios */}
                <li>
                    <button
                        onClick={() => setSubmenuLabOpen(!submenuLabOpen)}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-blue-200 shadow-sm
            bg-white text-gray-700 hover:bg-blue-600 hover:text-white hover:shadow-md
            transition-all duration-200 font-semibold group"
                    >
                        <span className="flex items-center gap-3">
                            <FaDesktop className="text-blue-600 group-hover:text-white transition-colors duration-200" />
                            Laboratórios
                        </span>
                        <IoIosArrowDown
                            className={`text-blue-600 group-hover:text-white transition-transform duration-300 ${submenuLabOpen ? "rotate-180" : "rotate-0"
                                }`}
                        />
                    </button>

                    <div
                        className={`grid transition-all duration-300 ease-in-out ${submenuLabOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                            }`}
                    >
                        <ul className="overflow-hidden ml-10 space-y-2">
                            <li>
                                <Link
                                    href="/laboratorios/pesquisar"
                                    onClick={() => setSidebarOpen(false)}
                                    className={`block px-3 py-2 rounded-md transition-colors ${pathname === "/laboratorios/pesquisar"
                                            ? "bg-blue-600 text-white shadow"
                                            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                                        }`}
                                >
                                    Pesquisar
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/laboratorios/cadastrar"
                                    onClick={() => setSidebarOpen(false)}
                                    className={`block px-3 py-2 rounded-md transition-colors ${pathname === "/laboratorios/cadastrar"
                                            ? "bg-blue-600 text-white shadow"
                                            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                                        }`}
                                >
                                    Cadastrar
                                </Link>
                            </li>
                        </ul>
                    </div>
                </li>
            </ul>
        </aside>
    )
}
