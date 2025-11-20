"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar"; // ajuste se necessário
import Header from "../components/Header"; // ajuste se necessário

const Chart: any = dynamic(() => import("react-apexcharts"), { ssr: false });
const BASE_URL = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "") : "";
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function HomePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) router.push("/login");
    }, [router]);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("login");
        }
        router.push("/login");
    };

    return (
        <div className="flex min-h-screen font-sans bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <Header titulo="Dashboard" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 p-6 md:p-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-700">Dashboard</h1>
                        <p className="text-gray-600">Resumo do sistema e reservas.</p>
                    </div>

                    <DashboardApex />

                </main>
            </div>
        </div>
    );
}

function DashboardApex() {
    const [reservasHoje, setReservasHoje] = useState<number | null>(null);
    const [laboratoriosAtivos, setLaboratoriosAtivos] = useState<number | null>(null);
    const [usuariosAtivos, setUsuariosAtivos] = useState<number | null>(null);
    const [seriesLine, setSeriesLine] = useState<number[]>(new Array(12).fill(0));
    const [usoLabs, setUsoLabs] = useState<{ laboratorio: string; horas: number }[]>([]);
    const [loadingKpi, setLoadingKpi] = useState<boolean>(true);
    const [loadingLine, setLoadingLine] = useState<boolean>(true);
    const [loadingBar, setLoadingBar] = useState<boolean>(true);

    const lineOptions: any = {
        chart: { id: "reservas-mes", toolbar: { show: true }, zoom: { enabled: false } },
        stroke: { curve: "smooth", width: 3 },
        xaxis: { categories: MONTH_LABELS },
        tooltip: { theme: "light" },
        markers: { size: 4 },
        responsive: [{ breakpoint: 640, options: { chart: { height: 220 }, legend: { show: false } } }]
    };

    // barSeries and barOptions agora são derivados do estado `usoLabs`
    const barSeries = [{ name: "Horas ocupadas", data: usoLabs.map((l) => Number(l.horas) || 0) }];
    const barOptions: any = {
        chart: { id: "uso-labs", toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
        xaxis: { categories: usoLabs.map((l) => l.laboratorio || "—") },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (val: number) => `${Number(val).toFixed(2)} h` } }
    };

    useEffect(() => {
        let active = true;
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const year = new Date().getFullYear();

        const endpoints = [
            `${BASE_URL}/reserva/dashboard/reservas-hoje`,
            `${BASE_URL}/laboratorios/dashboard/ativos`,
            `${BASE_URL}/usuarios/dashboard/ativos`,
            `${BASE_URL}/reserva/dashboard/reservas-por-ano?year=${year}`,
            // novo endpoint para uso por laboratório (mês atual por padrão)
            `${BASE_URL}/reserva/dashboard/uso-laboratorios-mes?year=${year}`
        ];

        const fetchAll = async () => {
            setLoadingKpi(true);
            setLoadingLine(true);
            setLoadingBar(true);
            try {
                const requests = endpoints.map((u) => fetch(u, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }));
                const responses = await Promise.all(requests);
                if (!active) return;

                // parse first three as numeric (they may return plain numbers)
                const parseNumberResponse = async (res: Response | undefined | null) => {
                    if (!res) return 0;
                    if (!res.ok) return 0;
                    const txt = await res.text();
                    const n = txt ? Number(txt) : 0;
                    return Number.isNaN(n) ? 0 : n;
                };

                const rHoje = await parseNumberResponse(responses[0]);
                const rLabs = await parseNumberResponse(responses[1]);
                const rUsers = await parseNumberResponse(responses[2]);

                if (!active) return;
                setReservasHoje(rHoje);
                setLaboratoriosAtivos(rLabs);
                setUsuariosAtivos(rUsers);

                // parse monthly series (JSON expected)
                if (responses[3] && responses[3].ok) {
                    try {
                        const json = await responses[3].json();
                        if (Array.isArray(json)) {
                            // normalize to 12 numbers
                            const normalized = new Array(12).fill(0).map((_, i) => {
                                const v = json[i];
                                return typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : 0);
                            });
                            setSeriesLine(normalized);
                        } else {
                            // unexpected shape
                            setSeriesLine(new Array(12).fill(0));
                        }
                    } catch (err) {
                        console.warn("Erro ao parsear JSON de reservas-por-ano:", err);
                        setSeriesLine(new Array(12).fill(0));
                    }
                } else {
                    setSeriesLine(new Array(12).fill(0));
                }

                // parse uso por laboratório (JSON expected: [{ laboratorio: "Lab A", horas: 120 }, ...])
                if (responses[4] && responses[4].ok) {
                    try {
                        const json = await responses[4].json();
                        if (Array.isArray(json)) {
                            const parsed = json.map((it: any) => {
                                // aceitar variações de nomes de campos
                                const nome = it.laboratorio ?? it.name ?? it.lab ?? "—";
                                const horasRaw = it.horas ?? it.h ?? it.value ?? 0;
                                const horas = Number(horasRaw);
                                return { laboratorio: nome, horas: Number.isNaN(horas) ? 0 : horas };
                            });
                            if (active) setUsoLabs(parsed);
                        } else {
                            if (active) setUsoLabs([]);
                        }
                    } catch (err) {
                        console.warn("Erro ao parsear JSON de uso-laboratorios:", err);
                        if (active) setUsoLabs([]);
                    }
                } else {
                    if (active) setUsoLabs([]);
                }

            } catch (err) {
                console.error("Erro ao buscar KPIs/series:", err);
                if (active) {
                    setReservasHoje(0);
                    setLaboratoriosAtivos(0);
                    setUsuariosAtivos(0);
                    setSeriesLine(new Array(12).fill(0));
                    setUsoLabs([]);
                }
            } finally {
                if (active) {
                    setLoadingKpi(false);
                    setLoadingLine(false);
                    setLoadingBar(false);
                }
            }
        };

        fetchAll();

        return () => { active = false; };
    }, []);

    return (
        <div className="min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-white rounded-2xl shadow-sm flex flex-col">
                    <span className="text-xs text-gray-500">Reservas hoje</span>
                    <span className="text-2xl font-semibold text-gray-800">{loadingKpi ? "..." : (reservasHoje ?? "—")}</span>
                    <span className="text-xs text-green-600 mt-2">{reservasHoje && reservasHoje > 0 ? `+${Math.round((reservasHoje / 10) * 100)}% vs ontem` : "Última atualização: agora"}</span>
                </div>

                <div className="p-4 bg-white rounded-2xl shadow-sm flex flex-col">
                    <span className="text-xs text-gray-500">Laboratórios ativos</span>
                    <span className="text-2xl font-semibold text-gray-800">{loadingKpi ? "..." : (laboratoriosAtivos ?? "—")}</span>
                    <span className="text-xs text-gray-500 mt-2">Última atualização: agora</span>
                </div>

                <div className="p-4 bg-white rounded-2xl shadow-sm flex flex-col">
                    <span className="text-xs text-gray-500">Usuários ativos</span>
                    <span className="text-2xl font-semibold text-gray-800">{loadingKpi ? "..." : (usuariosAtivos ?? "—")}</span>
                    <span className="text-xs text-gray-500 mt-2">Última atualização: agora</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-700 font-semibold">Reservas por mês</h3>
                        <span className="text-xs text-gray-500">Últimos 12 meses</span>
                    </div>
                    {loadingLine ? (
                        <div className="h-80 flex items-center justify-center text-gray-500">Carregando gráfico...</div>
                    ) : (
                        <Chart options={lineOptions} series={[{ name: "Reservas", data: seriesLine }]} type="line" height={320} width="100%" />
                    )}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-700 font-semibold">Uso por laboratório</h3>
                        <span className="text-xs text-gray-500">Horas ocupadas</span>
                    </div>

                    {loadingBar ? (
                        <div className="h-80 flex items-center justify-center text-gray-500">Carregando gráfico...</div>
                    ) : usoLabs.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-gray-500">Nenhum laboratório com uso neste mês</div>
                    ) : (
                        <Chart options={barOptions} series={barSeries} type="bar" height={320} width="100%" />
                    )}
                </div>
            </div>

            <p className="mt-6 text-xs text-gray-400">Nota: os KPIs e os dados mensais vêm dos endpoints <code>/reserva/dashboard/reservas-hoje</code>, <code>/laboratorios/dashboard/ativos</code>, <code>/usuarios/dashboard/ativos</code>, <code>/reserva/dashboard/reservas-por-ano</code> e <code>/reserva/dashboard/uso-laboratorios-mes</code>.</p>
        </div>
    );
}
