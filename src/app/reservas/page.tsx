// src/app/reservas/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import Sidebar from "../components/Sidebar";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ErrorAlert from "../components/ErrorAlert";

interface Usuario { id: string; login: string; nome: string; roles?: string[]; }
interface Laboratorio { id: number; nome: string; }
interface Semestre { id: number; dataInicio: string; dataFim: string; descricao?: string; }
interface Reserva {
    id: number;
    dataInicio: string | null;
    dataFim: string | null;
    status: string | null;
    tipo?: string | null;
    diaSemana: number | null;
    horaInicio: string | null;
    horaFim: string | null;
    ativo: boolean;
    usuario: Usuario;
    laboratorio: Laboratorio;
    semestre: Semestre;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ReservasPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [eventsState, setEventsState] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(false);
    const [openDialogDetalhes, setOpenDialogDetalhes] = useState(false);
    const [openDialogCadastro, setOpenDialogCadastro] = useState(false);
    const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
    const [dataSelecionada, setDataSelecionada] = useState<string>("");

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
    const [semestres, setSemestres] = useState<Semestre[]>([]);

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedLab, setSelectedLab] = useState<number | "">("");
    const [selectedSemestre, setSelectedSemestre] = useState<number | "">("");
    const [semestreEncontrado, setSemestreEncontrado] = useState<Semestre | null>(null);
    const [horaInicio, setHoraInicio] = useState<string>("08:00");
    const [horaFim, setHoraFim] = useState<string>("10:00");

    const [errorMessage, setErrorMessage] = useState<string>("");
    const [roles, setRoles] = useState<string[]>([]);

    const calendarRef = useRef<any>(null);
    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // responsividade: detectar mobile para ajustar toolbar / height
    const [isMobile, setIsMobile] = useState<boolean>(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(typeof window !== "undefined" ? window.innerWidth < 640 : false);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const resetCadastroDialog = () => {
        setSelectedUser("");
        // manteve selectedLab para não perder o laboratório pesquisado no topo
        setSelectedSemestre("");
        setSemestreEncontrado(null);
        setHoraInicio("08:00");
        setHoraFim("10:00");
        setDataSelecionada("");
    };

    // -----------------------
    // Decode JWT
    // -----------------------
    function parseJwt(token: string | null) {
        if (!token) return null;
        try {
            const base64 = token.split(".")[1];
            return JSON.parse(atob(base64));
        } catch {
            return null;
        }
    }

    useEffect(() => {
        const decoded = parseJwt(TOKEN);
        if (decoded?.roles) {
            const rolesArray = Array.isArray(decoded.roles)
                ? decoded.roles
                : [decoded.roles];
            setRoles(rolesArray);
        } else if (decoded?.authorities) {
            setRoles(decoded.authorities);
        }
    }, [TOKEN]);

    const podeCadastrarReserva = roles.some((r) =>
        ["ADMIN", "PROF", "PROF_COMP"].includes(r.toUpperCase())
    );

    // -----------------------
    // Fetch selects
    // -----------------------
    const fetchSelects = async () => {
        try {
            const decoded = parseJwt(TOKEN);
            const userRoles = decoded?.roles || decoded?.authorities || [];
            const userLogin = decoded?.sub; // claim 'sub' do token

            const [resProfessores, resLabs, resSemestres] = await Promise.all([
                fetch(`${BASE_URL}/usuarios/professores`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
                fetch(`${BASE_URL}/laboratorios`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
                fetch(`${BASE_URL}/semestre`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
            ]);

            const professoresData = await resProfessores.json();
            const laboratoriosData = await resLabs.json();
            const semestresData = await resSemestres.json();

            // 🔍 Aplica a filtragem com base na role
            let usuariosFiltrados = [];
            if (userRoles.some((r: string) => r.toUpperCase() === "ADMIN")) {
                usuariosFiltrados = professoresData; // Admin vê todos
            } else {
                // Outros veem apenas a si mesmos
                usuariosFiltrados = professoresData.filter(
                    (u: any) => u.login === userLogin
                );
            }

            setUsuarios(Array.isArray(usuariosFiltrados) ? usuariosFiltrados : []);
            setLaboratorios(Array.isArray(laboratoriosData) ? laboratoriosData : []);
            setSemestres(Array.isArray(semestresData) ? semestresData : []);
        } catch (err) {
            console.error("Erro ao buscar selects:", err);
            setErrorMessage("Erro ao buscar dados para o formulário");
        }
    };


    useEffect(() => {
        fetchSelects();
    }, []);

    // -----------------------
    // Buscar reservas
    // -----------------------
    const fetchReservasPorLab = async (labId: number | "", dataInicioParam?: string, dataFimParam?: string) => {
        if (!labId) {
            setErrorMessage("Selecione um laboratório antes de pesquisar.");
            return;
        }
        setLoading(true);
        try {
            const dataInicio = dataInicioParam ?? "2025-09-01T00:00:00";
            const dataFim = dataFimParam ?? "2025-12-31T23:59:59";
            const url = `${BASE_URL}/reserva/laboratorio/${labId}/periodo?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;

            const res = await fetch(url, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined });
            const text = await res.text();
            const data = text ? JSON.parse(text) : [];
            setReservas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar reservas do laboratório:", err);
            setErrorMessage("Erro ao carregar reservas do laboratório");
            setReservas([]);
        } finally {
            setLoading(false);
        }
    };

    const mapReservasParaEventos = (lista: Reserva[]): EventInput[] => {
        if (!Array.isArray(lista)) return [];
        return lista.flatMap((reserva) => {
            const color =
                reserva.status === "APROVADA"
                    ? "#16a34a"
                    : reserva.status === "PENDENTE"
                        ? "#f59e0b"
                        : reserva.tipo === "FIXA"
                            ? "#22c55e"
                            : "#6366f1";

            const outputs: EventInput[] = [];

            if (!reserva.dataInicio && reserva.diaSemana !== null && reserva.horaInicio) {
                const dayForFullCalendar = Number(reserva.diaSemana) % 7;
                outputs.push({
                    id: `fixa-${reserva.id}`,
                    title: `${reserva.usuario?.nome ?? "Usuário"} — ${reserva.laboratorio?.nome ?? "Lab"}`,
                    daysOfWeek: [dayForFullCalendar],
                    startTime: reserva.horaInicio!,
                    endTime: reserva.horaFim ?? undefined,
                    backgroundColor: color,
                    borderColor: color,
                    allDay: false,
                    extendedProps: { reserva },
                });
            }

            if (reserva.dataInicio) {
                const safeIso = encodeURIComponent(new Date(reserva.dataInicio).toISOString());
                outputs.push({
                    id: `normal-${reserva.id}-${safeIso}`,
                    title: `${reserva.usuario?.nome ?? "Usuário"} — ${reserva.laboratorio?.nome ?? "Lab"}`,
                    start: reserva.dataInicio,
                    end: reserva.dataFim ?? undefined,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: { reserva },
                });
            }

            return outputs;
        });
    };

    useEffect(() => {
        setEventsState(mapReservasParaEventos(reservas));
    }, [reservas]);

    const handleEventClick = (clickInfo: any) => {
        const ext = clickInfo.event.extendedProps;
        if (ext && ext.reserva) setSelectedReserva(ext.reserva as Reserva);
        else setSelectedReserva(null);
        setOpenDialogDetalhes(true);
    };

    // -----------------------
    // Buscar semestre por data (chama o endpoint que você criou)
    // -----------------------
    const fetchSemestrePorData = async (data: string) => {
        if (!data) return null;
        try {
            const param = encodeURIComponent(`${data}T00:00:00`);
            const res = await fetch(`${BASE_URL}/semestre/por-data?data=${param}`, {
                headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
            });

            if (!res.ok) {
                setSelectedSemestre("");
                setSemestreEncontrado(null);
                return null;
            }

            const semestre = await res.json();
            setSelectedSemestre(semestre?.id || "");
            setSemestreEncontrado(semestre || null);
            return semestre;
        } catch (err) {
            console.error("Erro ao buscar semestre por data", err);
            setSelectedSemestre("");
            setSemestreEncontrado(null);
            return null;
        }
    };

    const handleDateClick = async (info: any) => {
        if (!podeCadastrarReserva) return;
        const data = info.dateStr.split("T")[0];
        setDataSelecionada(data);

        // busca semestre automaticamente e preenche o select (não-editável)
        await fetchSemestrePorData(data);

        setOpenDialogCadastro(true);
    };

    const handleSalvarReserva = async () => {
        try {
            if (!selectedUser) {
                setErrorMessage("Selecione um usuário antes de salvar.");
                return;
            }

            if (!selectedSemestre) {
                setErrorMessage("Nenhum semestre válido para a data selecionada.");
                return;
            }

            const body = {
                usuarioId: selectedUser,
                laboratorioId: selectedLab,
                semestreId: selectedSemestre,
                dataInicio: `${dataSelecionada}T${horaInicio}`,
                dataFim: `${dataSelecionada}T${horaFim}`,
                status: "PENDENTE",
            };
            const res = await fetch(`${BASE_URL}/reserva/normal`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            const data = text ? JSON.parse(text) : null;

            if (!res.ok) {
                setOpenDialogCadastro(false);
                resetCadastroDialog();
                setErrorMessage(data?.errors?.join?.(", ") || "Erro ao criar reserva");
                return;
            }

            if (selectedLab) fetchReservasPorLab(selectedLab);
            setOpenDialogCadastro(false);
            resetCadastroDialog();
        } catch (err) {
            console.error(err);
            setOpenDialogCadastro(false);
            resetCadastroDialog();
            setErrorMessage("Erro de conexão com o servidor");
        }
    };

    // -----------------------
    // Cancelar / Aprovar (mantive seu código)
    // -----------------------
    const handleCancelarReserva = async () => {
        if (!selectedReserva) return;
        try {
            const res = await fetch(`${BASE_URL}/reserva/${selectedReserva.id}/cancelar`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${TOKEN}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                let errMsg = "Erro ao cancelar reserva";
                try {
                    const text = await res.text();
                    const data = text ? JSON.parse(text) : null;
                    errMsg = data?.message || data?.error || errMsg;
                } catch { }
                setErrorMessage(errMsg);
                return;
            }

            if (selectedReserva.laboratorio?.id) {
                fetchReservasPorLab(selectedReserva.laboratorio.id);
            }

            setSelectedReserva(null);
            setOpenDialogDetalhes(false);
        } catch (err) {
            console.error("Erro ao cancelar reserva", err);
            setErrorMessage("Erro ao cancelar reserva");
        }
    };

    const handleCancelarReservaFixa = async () => {
        if (!selectedReserva) return;

        try {
            const body = {
                reservaFixaId: selectedReserva.id,
                data: selectedReserva.dataInicio?.split("T")[0],
                tipo: "CANCELADA",
                motivo: "Cancelamento via Front"
            };

            const res = await fetch(`${BASE_URL}/reserva/fixa/excecao/cancelar`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                let errMsg = "Erro ao cancelar reserva fixa";
                try {
                    const text = await res.text();
                    const data = text ? JSON.parse(text) : null;
                    errMsg = data?.message || data?.error || errMsg;
                } catch { }
                setErrorMessage(errMsg);
                return;
            }

            if (selectedReserva.laboratorio?.id) {
                fetchReservasPorLab(selectedReserva.laboratorio.id);
            }

            setSelectedReserva(null);
            setOpenDialogDetalhes(false);
        } catch (err) {
            console.error("Erro ao cancelar reserva fixa", err);
            setErrorMessage("Erro ao cancelar reserva fixa");
        }
    };

    const handleAprovarReserva = async () => {
        if (!selectedReserva) return;

        try {
            const res = await fetch(`${BASE_URL}/reserva/${selectedReserva.id}/aprovar`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${TOKEN}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                let errMsg = "Erro ao aprovar reserva";
                try {
                    const text = await res.text();
                    const data = text ? JSON.parse(text) : null;
                    errMsg = data?.message || data?.error || errMsg;
                } catch { }
                setErrorMessage(errMsg);
                return;
            }

            if (selectedReserva.laboratorio?.id) {
                fetchReservasPorLab(selectedReserva.laboratorio.id);
            }

            setSelectedReserva(null);
            setOpenDialogDetalhes(false);
        } catch (err) {
            console.error("Erro ao aprovar reserva", err);
            setErrorMessage("Erro ao aprovar reserva");
        }
    };

    // -----------------------
    // Controle de permissões
    // -----------------------
    function podeCancelar(reserva: Reserva | null): boolean {
        if (!reserva) return false;
        const decoded = parseJwt(TOKEN);
        const userRoles = decoded?.roles || decoded?.authorities || [];
        const userLogin = decoded?.sub;

        const isAdmin = userRoles.some((r: string) => r.toUpperCase() === "ADMIN");
        const isProf = userRoles.some((r: string) => r.toUpperCase() === "PROF");
        const isProfComp = userRoles.some((r: string) => r.toUpperCase() === "PROF_COMP");

        if (isAdmin) return true;

        const reservaUser = reserva.usuario;
        if (!reservaUser) return false;

        const reservaRoles = reservaUser.roles?.map((r) => r.toUpperCase()) || [];

        // PROF só cancela suas próprias reservas
        if (isProf) {
            return reservaUser.login === userLogin;
        }

        // PROF_COMP cancela reservas de PROF_COMP e PROF
        if (isProfComp) {
            return reservaRoles.includes("PROF_COMP") || reservaRoles.includes("PROF");
        }

        return false;
    }

    // -----------------------
    // Render event content (ajustado para mobile)
    // -----------------------
    const renderEventContent = (eventInfo: any) => {
        const { event } = eventInfo;
        const bgColor = event.backgroundColor ?? "#6366f1";
        const reserva: Reserva | undefined = event.extendedProps?.reserva;

        // Horário formatado (se disponível)
        const startHour = event.start
            ? event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
            : "";
        const endHour = event.end
            ? event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
            : "";

        return (
            <div
                className={`w-full block rounded-lg px-2 py-1 text-white flex flex-col shadow-md ${isMobile ? 'gap-0.5 py-1' : 'gap-1 py-2'}`}
                style={{ backgroundColor: bgColor }}
            >
                {/* Mostrar horário apenas em telas maiores */}
                {!isMobile && (
                    <span className="text-[11px] font-semibold leading-tight">
                        {startHour}{endHour ? ` - ${endHour}` : ""}
                    </span>
                )}

                {/* Usuário (linha principal) */}
                <span className={`text-[12px] font-semibold truncate ${isMobile ? 'text-sm' : ''}`}>
                    {reserva?.usuario?.nome ?? event.title}
                </span>

                {/* Laboratório (linha secundária) */}
                <span className={`text-[11px] truncate ${isMobile ? 'text-xs opacity-95' : ''}`}>
                    {reserva?.laboratorio?.nome ?? ''}
                </span>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}

            <div className="flex-1 flex flex-col min-h-screen">
                <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-4 px-4 sm:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        {/* botão hambúrguer visível só no mobile */}
                        <button
                            type="button"
                            className="md:hidden p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Abrir menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>

                        <h1 className="text-lg sm:text-xl font-semibold">Calendário de Reservas</h1>
                    </div>
                </div>

                <main className="flex-1 p-3 sm:p-6 md:p-8 w-full">
                    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 overflow-hidden">
                        {/* Barra de filtros */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <select
                                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={selectedLab}
                                onChange={(e) => setSelectedLab(e.target.value === "" ? "" : Number(e.target.value))}
                            >
                                <option value="">Selecione um laboratório</option>
                                {laboratorios.map((l) => (
                                    <option key={l.id} value={l.id}>{l.nome}</option>
                                ))}
                            </select>
                            <Button
                                className="sm:w-auto"
                                onClick={() => { if (!selectedLab) setErrorMessage("Selecione um laboratório."); else fetchReservasPorLab(selectedLab); }}
                            >
                                Pesquisar
                            </Button>
                            {loading && <span className="text-gray-500 ml-auto">Carregando reservas...</span>}
                        </div>

                        {/* Calendário */}
                        <div className="w-full overflow-hidden">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                locale={ptBrLocale}
                                firstDay={1}
                                headerToolbar={isMobile ? { left: "prev,next", center: "title", right: "timeGridWeek" } : {
                                    left: "prev,next today",
                                    center: "title",
                                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                                }}
                                buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }}
                                moreLinkContent={(n) => `+${n} outros`}
                                events={eventsState}
                                eventClick={handleEventClick}
                                dateClick={handleDateClick}
                                eventContent={renderEventContent}
                                slotMinTime="07:00:00"
                                slotMaxTime="22:00:00"
                                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                                allDaySlot={false}
                                height={isMobile ? "60vh" : "80vh"}
                            />
                        </div>

                    </div>
                </main>
            </div>

            {/* Dialog detalhes */}
            <Dialog open={openDialogDetalhes} onOpenChange={setOpenDialogDetalhes}>
                <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Reserva</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2 mt-2">
                                {selectedReserva ? (
                                    <>
                                        <div><strong>Usuário:</strong> {selectedReserva.usuario?.nome} ({selectedReserva.usuario?.login})</div>
                                        <div><strong>Laboratório:</strong> {selectedReserva.laboratorio?.nome}</div>
                                        <div><strong>Status:</strong> {selectedReserva.status ?? "-"}</div>
                                        {selectedReserva.dataInicio ? (
                                            <div><strong>Início:</strong> {selectedReserva.dataInicio} <br /><strong>Fim:</strong> {selectedReserva.dataFim ?? "-"}</div>
                                        ) : (
                                            <div><strong>Recorrência:</strong> dia {selectedReserva.diaSemana ?? "-"} — {selectedReserva.horaInicio ?? "-"} até {selectedReserva.horaFim ?? "-"}</div>
                                        )}
                                        <div><strong>Semestre:</strong> {selectedReserva.semestre?.descricao ?? "-"}</div>
                                    </>
                                ) : <div>Reserva não encontrada</div>}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-between">
                        <Button onClick={() => setOpenDialogDetalhes(false)}>Fechar</Button>

                        <div className="flex gap-2">
                            {selectedReserva?.status !== "CANCELADA" && podeCancelar(selectedReserva) && (
                                <>
                                    {selectedReserva?.tipo === "NORMAL" ? (
                                        <Button variant="destructive" onClick={handleCancelarReserva}>
                                            Cancelar Reserva
                                        </Button>
                                    ) : selectedReserva?.tipo === "FIXA" ? (
                                        <Button variant="destructive" onClick={handleCancelarReservaFixa}>
                                            Cancelar Reserva Fixa
                                        </Button>
                                    ) : null}
                                </>
                            )}

                            {roles.includes("ADMIN") &&
                                selectedReserva?.tipo === "NORMAL" &&
                                selectedReserva?.status !== "APROVADA" && (
                                    <Button variant="secondary" onClick={handleAprovarReserva}>
                                        Aprovar Reserva
                                    </Button>
                                )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog cadastro — só aparece se o usuário tiver permissão */}
            {podeCadastrarReserva && (
                <Dialog open={openDialogCadastro} onOpenChange={(open) => { setOpenDialogCadastro(open); if (!open) resetCadastroDialog(); }}>
                    <DialogContent className="max-w-md rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Nova Reserva</DialogTitle>
                            <DialogDescription asChild>
                                <div className="space-y-3 mt-2">
                                    {dataSelecionada && <div className="p-2 bg-gray-100 rounded">Data selecionada: {dataSelecionada}</div>}

                                    <div className="flex gap-2">
                                        <input type="time" className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                                        <input type="time" className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                                    </div>

                                    <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} required aria-required="true">
                                        <option value="">Selecione o usuário</option>
                                        {usuarios.map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
                                    </select>

                                    <select
                                        className="border rounded-lg px-3 py-2 w-full bg-gray-100 cursor-not-allowed"
                                        value={selectedLab}
                                        disabled
                                    >
                                        <option value="">
                                            {selectedLab
                                                ? laboratorios.find((l) => l.id === selectedLab)?.nome || "Laboratório selecionado"
                                                : "Nenhum laboratório selecionado"}
                                        </option>
                                    </select>

                                    {/* Semestre NÃO selecionável — preenchido pela consulta por data */}
                                    <select
                                        className="border rounded-lg px-3 py-2 w-full bg-gray-100 cursor-not-allowed"
                                        value={selectedSemestre}
                                        disabled
                                    >
                                        <option value="">
                                            {semestreEncontrado
                                                ? semestreEncontrado.descricao || `${semestreEncontrado.dataInicio} - ${semestreEncontrado.dataFim}`
                                                : (selectedSemestre
                                                    ? semestres.find((s) => s.id === selectedSemestre)?.descricao || "Semestre selecionado"
                                                    : "Nenhum semestre encontrado")}
                                        </option>
                                    </select>

                                    <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedSemestre} onChange={(e) => setSelectedSemestre(Number(e.target.value))} style={{ display: 'none' }}>
                                        {/* Mantive o select original (escondido) para compatibilidade, mas o usuário não vê ele */}
                                        <option value="">Selecione o semestre</option>
                                        {semestres.map((s) => (<option key={s.id} value={s.id}>{s.descricao}</option>))}
                                    </select>
                                </div>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="space-x-2">
                            <Button onClick={handleSalvarReserva} disabled={!selectedSemestre || !selectedUser} title={!selectedUser ? "Selecione um usuário" : !selectedSemestre ? "Semestre inválido" : ""}>Salvar</Button>
                            <Button variant="ghost" onClick={() => setOpenDialogCadastro(false)}>Cancelar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <ErrorAlert message={errorMessage} onClose={() => setErrorMessage("")} />

            {/* estilos específicos para melhorar responsividade do FullCalendar */}
            <style jsx>{`
                /* reduz um pouco o título do toolbar e botões em mobile */
                .fc .fc-toolbar-title { font-weight: 700; font-size: 1.25rem; }
                @media (max-width: 640px) {
                    .fc .fc-toolbar-title { font-size: 1rem; line-height: 1.1; }
                    .fc .fc-toolbar-chunk { gap: 0.25rem; display: flex; align-items: center; flex-wrap: nowrap; }
                    .fc .fc-button { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
                    .fc .fc-col-header-cell-cushion { font-size: 0.72rem; }
                    .fc .fc-daygrid-day-top { font-size: 0.72rem; }
                    /* permitir que a área de visualização role verticalmente sem quebrar layout */
                    .fc .fc-scroller { -webkit-overflow-scrolling: touch; }
                }
            `}</style>
        </div>
    );
}
