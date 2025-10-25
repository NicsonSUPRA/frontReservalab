"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import Header from "../../components/Header";

// Função para decodificar JWT
function parseJwt(token: string | null) {
    if (!token) return null
    try {
        const base64 = token.split('.')[1]
        return JSON.parse(atob(base64))
    } catch (e) {
        return null
    }
}

interface Laboratorio {
    id: string
    nome: string
}

type Notificacao = { type: "success" | "error" | "info"; message: string } | null

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function LaboratorioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [laboratorio, setLaboratorio] = useState<Laboratorio | null>(null)
    const [original, setOriginal] = useState<Laboratorio | null>(null)
    const [notificacao, setNotificacao] = useState<Notificacao>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editando, setEditando] = useState(false)
    const [roles, setRoles] = useState<string[]>([])

    const router = useRouter()
    const params = useParams()
    const id = (params as any)?.id as string | undefined

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    useEffect(() => {
        if (!token) router.push("/login")
    }, [router, token])

    // Decodifica roles do JWT
    useEffect(() => {
        const decoded = parseJwt(token)
        if (decoded?.roles && Array.isArray(decoded.roles)) {
            setRoles(decoded.roles)
        }
    }, [token])

    const podeEditar = roles.includes("ADMIN")

    useEffect(() => {
        if (!id || !token) return
        let mounted = true

        const fetchLab = async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API_URL}/laboratorios/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error("Erro ao buscar laboratório")
                const data = await res.json()
                if (!mounted) return
                setLaboratorio(data)
                setOriginal(data)
            } catch (err) {
                console.error(err)
                setNotificacao({ type: "error", message: "Falha ao carregar laboratório." })
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchLab()
        return () => { mounted = false }
    }, [id, token])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!laboratorio) return
        setLaboratorio({ ...laboratorio, [e.target.name]: e.target.value } as Laboratorio)
    }

    const validate = () => {
        if (!laboratorio) return false
        if (!laboratorio.nome || !laboratorio.nome.trim()) {
            setNotificacao({ type: "error", message: "Nome é obrigatório." })
            return false
        }
        return true
    }

    const handleAtualizar = async () => {
        if (!laboratorio || !token) return
        setNotificacao(null)
        if (!validate()) return

        setSaving(true)
        try {
            const res = await fetch(`${API_URL}/laboratorios/${laboratorio.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nome: laboratorio.nome }),
            })

            if (res.ok) {
                setNotificacao({ type: "success", message: "Laboratório atualizado com sucesso!" })
                setEditando(false)
                setOriginal({ ...laboratorio })
            } else {
                const data = await res.json().catch(() => ({}))
                setNotificacao({ type: "error", message: data.mensagem || data.message || "Erro ao atualizar laboratório." })
            }
        } catch (err) {
            console.error(err)
            setNotificacao({ type: "error", message: "Falha na conexão com o servidor." })
        } finally {
            setSaving(false)
        }
    }

    const handleCancelar = () => {
        if (original) setLaboratorio(original)
        setEditando(false)
        setNotificacao(null)
    }

    const INPUT_CLASS =
        "w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 focus:outline-none bg-white border-gray-200"

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
                <div className="text-center p-8 bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl max-w-sm w-full mx-4 border border-white/20">
                    <div className="relative mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-purple-600 animate-pulse"></div>
                        <div className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Carregando laboratório</h2>
                    <p className="text-sm text-gray-600">Aguarde um momento...</p>
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 h-1 rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                </div>
            </div>
        )
    }

    if (!laboratorio) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4">
                <div className="w-full max-w-md bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
                    <div className="p-8 text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Laboratório não encontrado</h2>
                        <p className="text-gray-600 mb-4">Erro ao carregar os dados do laboratório.</p>
                        <button onClick={() => router.back()} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Voltar</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <Header titulo={editando ? "Editar Laboratório" : "Visualizar Laboratório"} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <header className="p-4 bg-white/70 backdrop-blur-lg md:hidden flex items-center shadow-lg sticky top-0 z-10 border-b border-white/20">
                    <h1 className="ml-3 font-bold text-lg text-gray-800">Sistema de Reservas</h1>
                </header>

                <main className="flex-1 p-4 lg:p-8 xl:p-12">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-violet-200 shadow-lg rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-2xl font-bold">
                                            {laboratorio.nome?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "LB"}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">{editando ? "Editar Laboratório" : "Perfil do Laboratório"}</h1>
                                    <p className="text-gray-600 flex items-center gap-2"><span>ID:</span> <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{laboratorio.id}</span></p>
                                </div>
                            </div>

                            {podeEditar && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setEditando(true); setNotificacao(null) }}
                                        className="h-12 px-5 rounded-lg font-semibold shadow-lg transition transform bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                                    >
                                        Liberar edição
                                    </button>
                                </div>
                            )}
                        </div>

                        {notificacao && (
                            <div className={`p-4 rounded-lg border-l-4 shadow-lg ${notificacao.type === "success" ? "border-l-green-500 bg-green-50 text-green-800" : "border-l-red-500 bg-red-50 text-red-800"}`}>
                                <span className="font-medium text-base">{notificacao.message}</span>
                            </div>
                        )}

                        <div className="bg-white/70 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl overflow-hidden">
                            <div className="pb-6 bg-gradient-to-r from-violet-100 to-purple-100 border-b border-white/20 p-6">
                                <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                                    Informações do Laboratório
                                </h2>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label htmlFor="nome" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            Nome do Laboratório
                                        </label>
                                        <input
                                            id="nome"
                                            name="nome"
                                            value={laboratorio.nome}
                                            onChange={handleChange}
                                            disabled={!editando || !podeEditar}
                                            className={`${INPUT_CLASS} ${!editando || !podeEditar ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"}`}
                                            placeholder="Digite o nome do laboratório"
                                        />
                                    </div>
                                </div>

                                {editando && podeEditar && (
                                    <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200">
                                        <button
                                            onClick={handleAtualizar}
                                            disabled={saving}
                                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white flex-1 h-12 px-6 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : "Salvar Alterações"}
                                        </button>

                                        <button
                                            onClick={handleCancelar}
                                            disabled={saving}
                                            className="border border-gray-300 hover:bg-gray-50 text-gray-700 flex-1 h-12 px-6 text-base font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
