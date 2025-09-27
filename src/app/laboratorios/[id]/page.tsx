"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"

interface Laboratorio {
    id: string
    nome: string
}

type Notificacao = { type: "success" | "error" | "info"; message: string } | null

export default function LaboratorioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [laboratorio, setLaboratorio] = useState<Laboratorio | null>(null)
    const [original, setOriginal] = useState<Laboratorio | null>(null)
    const [notificacao, setNotificacao] = useState<Notificacao>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editando, setEditando] = useState(false)

    const router = useRouter()
    const params = useParams()
    const id = (params as any)?.id as string | undefined
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    useEffect(() => {
        if (!token) router.push("/login")
    }, [router, token])

    useEffect(() => {
        if (!id || !token) return
        let mounted = true

        const fetchLab = async () => {
            setLoading(true)
            try {
                const res = await fetch(`http://localhost:8080/laboratorios/${id}`, {
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
        return () => {
            mounted = false
        }
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
            const res = await fetch(`http://localhost:8080/laboratorios?id=${laboratorio.id}`, {
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
        "w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 focus:outline-none" +
        " bg-white border-gray-200"

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
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Laboratório não encontrado</h2>
                        <p className="text-gray-600 mb-4">Erro ao carregar os dados do laboratório.</p>
                        <button onClick={() => router.back()} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Voltar</button>
                    </div>
                </div>pesquisar
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="p-4 bg-white/70 backdrop-blur-lg md:hidden flex items-center shadow-lg sticky top-0 z-10 border-b border-white/20">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 p-2 rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
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

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setEditando(true); setNotificacao(null) }}
                                    className={`h-12 px-5 rounded-lg font-semibold shadow-lg transition transform ${!editando ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700" : "bg-gray-100 text-gray-700"}`}
                                >
                                    Liberar edição
                                </button>
                            </div>
                        </div>

                        {notificacao && (
                            <div className={`p-4 rounded-lg border-l-4 shadow-lg ${notificacao.type === "success" ? "border-l-green-500 bg-green-50 text-green-800" : "border-l-red-500 bg-red-50 text-red-800"}`}>
                                <div className="flex items-center gap-3">
                                    {notificacao.type === "success" ? (
                                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    )}
                                    <span className="font-medium text-base">{notificacao.message}</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/70 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl overflow-hidden">
                            <div className="pb-6 bg-gradient-to-r from-violet-100 to-purple-100 border-b border-white/20 p-6">
                                <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                        </svg>
                                    </div>
                                    Informações do Laboratório
                                </h2>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label htmlFor="nome" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8v8H8z" />
                                            </svg>
                                            Nome do Laboratório
                                        </label>
                                        <input
                                            id="nome"
                                            name="nome"
                                            value={laboratorio.nome}
                                            onChange={handleChange}
                                            disabled={!editando}
                                            className={`${INPUT_CLASS} ${!editando ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"}`}
                                            placeholder="Digite o nome do laboratório"
                                            aria-invalid={!laboratorio.nome || laboratorio.nome.trim() === ""}
                                        />
                                    </div>

                                    {/* <div className="space-y-3">
                                        <label className="text-sm font-semibold text-gray-700">Status</label>
                                        <div className="h-12 px-4 flex items-center rounded-lg bg-gray-50 border border-gray-200">Visualização</div>
                                    </div> */}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200">
                                    {!editando ? (
                                        <button
                                            onClick={() => { setEditando(true); setNotificacao(null) }}
                                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 h-12 px-6 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 rounded-lg"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Editar Informações
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleAtualizar}
                                                disabled={saving}
                                                className={`bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 flex-1 h-12 px-6 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none rounded-lg disabled:opacity-50`}
                                            >
                                                {saving ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        Salvando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        Salvar Alterações
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={handleCancelar}
                                                disabled={saving}
                                                className="border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-3 flex-1 h-12 px-6 text-base font-semibold transition-all duration-300 hover:shadow-md rounded-lg disabled:opacity-50"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Cancelar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl">
                            <div className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-white/20 p-6">
                                <h3 className="text-xl font-bold flex items-center gap-3 text-gray-800">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                        </svg>
                                    </div>
                                    Pré-visualização do Laboratório
                                </h3>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-gray-50 via-purple-50 to-violet-50 rounded-xl border border-gray-200">
                                    <div className="w-16 h-16 border-3 border-violet-200 shadow-lg rounded-full bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">{laboratorio.nome?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "LB"}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-xl text-gray-800 mb-1">{laboratorio.nome || "Nome não definido"}</h4>
                                        <div className="text-gray-600 text-sm">ID: <span className="font-mono text-sm text-gray-500">{laboratorio.id}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    )
}
