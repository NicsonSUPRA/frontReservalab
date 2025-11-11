"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { login } from "../services/auth"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [isMobile, setIsMobile] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)

        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current && !isMobile) {
                const rect = containerRef.current.getBoundingClientRect()
                setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                })
            }
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("resize", checkMobile)
        }
    }, [isMobile])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await login(username, password)
            router.push("/")
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <div
            ref={containerRef}
            className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden p-4"
        >
            {!isMobile && (
                <div
                    className="pointer-events-none fixed w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-blue-400/30 to-blue-200/30 rounded-full blur-3xl"
                    style={{
                        left: `${mousePosition.x - 144}px`,
                        top: `${mousePosition.y - 144}px`,
                        transition: "all 0.3s ease-out",
                    }}
                />
            )}

            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-10 sm:top-20 right-10 sm:right-20 w-40 sm:w-64 h-40 sm:h-64 bg-blue-100/40 rounded-full blur-2xl animate-pulse" />
                <div
                    className="absolute bottom-10 sm:bottom-20 left-10 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-blue-50/30 rounded-full blur-3xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                />
            </div>

            <form
                ref={formRef}
                onSubmit={handleLogin}
                className="relative z-10 bg-white/80 backdrop-blur-md p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-sm md:max-w-md border border-white/20 transform transition-all duration-300 hover:shadow-3xl hover:bg-white/90"
            >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 via-blue-200/0 to-blue-400/0 hover:from-blue-400/20 hover:via-blue-200/20 hover:to-blue-400/20 transition-all duration-500 pointer-events-none" />

                <div className="relative">
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent text-center animate-in fade-in slide-in-from-top-4 duration-500">
                        Login
                    </h1>
                    <p className="text-center text-gray-500 text-xs sm:text-sm mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-3 duration-700">
                        Acesse sua conta
                    </p>

                    {error && (
                        <p className="text-red-500 mb-4 text-xs sm:text-sm text-center font-medium bg-red-50/50 border border-red-200/50 rounded-lg p-3 backdrop-blur-sm animate-in shake duration-300">
                            {error}
                        </p>
                    )}

                    <div className="space-y-4 mb-6">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Usuário"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 focus:bg-white transition-all duration-300 group-hover:border-blue-300/50 group-hover:bg-white/70"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/0 to-blue-300/0 group-focus-within:from-blue-400/10 group-focus-within:to-blue-300/10 transition-all duration-300 pointer-events-none" />
                        </div>

                        <div className="relative group">
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 focus:bg-white transition-all duration-300 group-hover:border-blue-300/50 group-hover:bg-white/70"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/0 to-blue-300/0 group-focus-within:from-blue-400/10 group-focus-within:to-blue-300/10 transition-all duration-300 pointer-events-none" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full relative bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-2xl overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                        <span className="relative">Entrar</span>
                    </button>
                </div>
            </form>
        </div>
    )
}
