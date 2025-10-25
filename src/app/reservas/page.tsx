"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

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

interface Disciplina { id?: number; nome: string; descricao?: string; usuario?: { id: string } | null; }
interface Usuario { id: string; login: string; nome: string; roles?: string[]; disciplinas?: Disciplina[]; }
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
    disciplina?: Disciplina | null;
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
    const [disciplinasGlobais, setDisciplinasGlobais] = useState<Disciplina[]>([]);
    const [disciplinasAtuais, setDisciplinasAtuais] = useState<Disciplina[]>([]);

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedLab, setSelectedLab] = useState<number | "">("");
    const [selectedSemestre, setSelectedSemestre] = useState<number | "">("");
    const [selectedDisciplina, setSelectedDisciplina] = useState<number | "">("");
    const [semestreEncontrado, setSemestreEncontrado] = useState<Semestre | null>(null);
    const [horaInicio, setHoraInicio] = useState<string>("08:00");
    const [horaFim, setHoraFim] = useState<string>("10:00");

    const [errorMessage, setErrorMessage] = useState<string>("");
    const [roles, setRoles] = useState<string[]>([]);

    const calendarRef = useRef<any>(null);
    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const [isMobile, setIsMobile] = useState<boolean>(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(typeof window !== "undefined" ? window.innerWidth < 640 : false);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const resetCadastroDialog = () => {
        setSelectedUser("");
        setSemestreEncontrado(null);
        setHoraInicio("08:00");
        setHoraFim("10:00");
        setDataSelecionada("");
        setSelectedDisciplina("");
        setDisciplinasAtuais([]);
    };

    function parseJwt(token: string | null) {
        if (!token) return null;
        try { const base64 = token.split(".")[1]; return JSON.parse(atob(base64)); } catch { return null; }
    }

    useEffect(() => {
        const decoded = parseJwt(TOKEN);
        if (decoded?.roles) setRoles(Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles]);
        else if (decoded?.authorities) setRoles(decoded.authorities);
    }, [TOKEN]);

    const podeCadastrarReserva = roles.some((r) => ["ADMIN", "PROF", "PROF_COMP"].includes(r.toUpperCase()));

    const fetchSelects = async () => {
        try {
            const decoded = parseJwt(TOKEN);
            const userRoles = decoded?.roles || decoded?.authorities || [];
            const userLogin = decoded?.sub;

            const requests = [
                fetch(`${BASE_URL}/usuarios/professores`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(`${BASE_URL}/laboratorios`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(`${BASE_URL}/semestre`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(`${BASE_URL}/disciplinas`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
            ];

            const [resProfessores, resLabs, resSemestres, resDisciplinas] = await Promise.all(requests);

            const professoresData = await resProfessores.json().catch(() => []);
            const laboratoriosData = await resLabs.json().catch(() => []);
            const semestresData = await resSemestres.json().catch(() => []);
            const disciplinasData = await resDisciplinas.json().catch(() => []);

            let usuariosFiltrados: Usuario[] = [];
            if (userRoles.some((r: string) => r.toUpperCase() === "ADMIN")) usuariosFiltrados = professoresData;
            else usuariosFiltrados = (professoresData || []).filter((u: any) => u.login === userLogin);

            setUsuarios(Array.isArray(usuariosFiltrados) ? usuariosFiltrados : []);
            setLaboratorios(Array.isArray(laboratoriosData) ? laboratoriosData : []);
            setSemestres(Array.isArray(semestresData) ? semestresData : []);
            setDisciplinasGlobais(Array.isArray(disciplinasData) ? disciplinasData : []);
        } catch (err) { console.error("Erro ao buscar selects:", err); setErrorMessage("Erro ao buscar dados para o formulário"); }
    };

    useEffect(() => { fetchSelects(); }, []);

    useEffect(() => {
        if (!selectedUser) { setDisciplinasAtuais([]); setSelectedDisciplina(""); return; }
        const user = usuarios.find((u) => u.id === selectedUser);
        if (user && Array.isArray(user.disciplinas) && user.disciplinas.length > 0) setDisciplinasAtuais(user.disciplinas);
        else setDisciplinasAtuais(disciplinasGlobais.filter((d) => !d.usuario || d.usuario.id === selectedUser));
        setSelectedDisciplina("");
    }, [selectedUser, usuarios, disciplinasGlobais]);

    const fetchReservasPorLab = async (labId: number | "", dataInicioParam?: string, dataFimParam?: string) => {
        if (!labId) { setErrorMessage("Selecione um laboratório antes de pesquisar."); return; }
        setLoading(true);
        try {
            const dataInicio = dataInicioParam ?? "2025-09-01T00:00:00";
            const dataFim = dataFimParam ?? "2025-12-31T23:59:59";
            const url = `${BASE_URL}/reserva/laboratorio/${labId}/periodo?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
            const res = await fetch(url, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined });
            const text = await res.text();
            const data = text ? JSON.parse(text) : [];
            setReservas(Array.isArray(data) ? data : []);
        } catch (err) { console.error("Erro ao carregar reservas do laboratório:", err); setErrorMessage("Erro ao carregar reservas do laboratório"); setReservas([]); }
        finally { setLoading(false); }
    };

    const mapReservasParaEventos = (lista: Reserva[]): EventInput[] => {
        if (!Array.isArray(lista)) return [];
        return lista.flatMap((reserva) => {
            const isReservaFixa = reserva.tipo === "FIXA";
            const color: string = (isReservaFixa && reserva.status === null) ? "#22c55e" : reserva.status === "CONFIRMADA" ? "#0c92b4ff" : reserva.status === "APROVADA" ? "#16a34a" : reserva.status === "PENDENTE" ? "#f59e0b" : "#3537c2ff";

            const outputs: EventInput[] = [];
            if (!reserva.dataInicio && reserva.diaSemana !== null && reserva.horaInicio) {
                const dayForFullCalendar = Number(reserva.diaSemana) % 7;
                outputs.push({ id: `fixa-${reserva.id}`, title: `${reserva.usuario?.nome ?? "Usuário"} — ${reserva.laboratorio?.nome ?? "Lab"}`, daysOfWeek: [dayForFullCalendar], startTime: reserva.horaInicio!, endTime: reserva.horaFim ?? undefined, backgroundColor: color, borderColor: color, allDay: false, extendedProps: { reserva } });
            }
            if (reserva.dataInicio) {
                const safeIso = encodeURIComponent(new Date(reserva.dataInicio).toISOString());
                outputs.push({ id: `normal-${reserva.id}-${safeIso}`, title: `${reserva.usuario?.nome ?? "Usuário"} — ${reserva.laboratorio?.nome ?? "Lab"}`, start: reserva.dataInicio, end: reserva.dataFim ?? undefined, backgroundColor: color, borderColor: color, extendedProps: { reserva } });
            }
            return outputs;
        });
    };

    useEffect(() => { setEventsState(mapReservasParaEventos(reservas)); }, [reservas]);

    const longPressTimeouts = useRef<Record<string, number | null>>({});
    const longPressFiredRef = useRef(false);
    // Alterado: estado do popup agora guarda posição e cor (só o necessário)
    const [longPressPopup, setLongPressPopup] = useState<{ visible: boolean; nome?: string; x?: number | null; y?: number | null; color?: string | null }>({ visible: false, x: null, y: null, color: null });

    useEffect(() => { return () => { Object.values(longPressTimeouts.current).forEach((t) => { if (t) window.clearTimeout(t); }); }; }, []);

    const getContrastColor = (hex?: string | null) => { if (!hex) return '#fff'; const h = hex.replace('#', '').slice(0, 6); const r = parseInt(h.substring(0, 2), 16); const g = parseInt(h.substring(2, 4), 16); const b = parseInt(h.substring(4, 6), 16); const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; return luminance > 0.6 ? '#000' : '#fff'; };

    const handleEventClick = async (clickInfo: any) => {
        if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }

        const ext = clickInfo.event.extendedProps;
        let reserva: Reserva | null = ext && ext.reserva ? (ext.reserva as Reserva) : null;

        const occurrenceDate = clickInfo.event.start ? new Date(clickInfo.event.start) : null;
        const occurrenceDateStr = occurrenceDate ? occurrenceDate.toISOString().split("T")[0] : "";

        if (reserva) {
            if (!reserva.disciplina && reserva.usuario?.disciplinas && reserva.usuario.disciplinas.length === 1) reserva = { ...reserva, disciplina: reserva.usuario.disciplinas[0] };
            if (!reserva.disciplina) {
                try { const res = await fetch(`${BASE_URL}/reserva/${reserva.id}`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }); if (res.ok) { const text = await res.text(); const data = text ? JSON.parse(text) : null; if (data) reserva = data; } } catch (err) { console.warn("Não foi possível buscar reserva detalhada:", err); }
            }
        }

        setSelectedReserva(reserva);
        if (occurrenceDateStr) setDataSelecionada(occurrenceDateStr);
        else if (reserva?.dataInicio) setDataSelecionada(new Date(reserva.dataInicio).toISOString().split('T')[0]);
        else setDataSelecionada("");

        setOpenDialogDetalhes(true);
    };

    const fetchSemestrePorData = async (data: string) => { if (!data) return null; try { const param = encodeURIComponent(`${data}T00:00:00`); const res = await fetch(`${BASE_URL}/semestre/por-data?data=${param}`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }); if (!res.ok) { setSelectedSemestre(""); setSemestreEncontrado(null); return null; } const semestre = await res.json(); setSelectedSemestre(semestre?.id || ""); setSemestreEncontrado(semestre || null); return semestre; } catch (err) { console.error("Erro ao buscar semestre por data", err); setSelectedSemestre(""); setSemestreEncontrado(null); return null; } };

    const handleDateClick = async (info: any) => { if (!podeCadastrarReserva) return; const data = info.dateStr.split("T")[0]; setDataSelecionada(data); await fetchSemestrePorData(data); setOpenDialogCadastro(true); };

    const handleSalvarReserva = async () => { try { if (!selectedUser) { setErrorMessage("Selecione um usuário antes de salvar."); return; } if (!selectedSemestre) { setErrorMessage("Nenhum semestre válido para a data selecionada."); return; } if (!selectedLab) { setErrorMessage("Laboratório inválido."); return; } const body: any = { usuarioId: selectedUser, laboratorioId: selectedLab, semestreId: selectedSemestre, dataInicio: `${dataSelecionada}T${horaInicio}`, dataFim: `${dataSelecionada}T${horaFim}`, status: "PENDENTE" }; if (selectedDisciplina !== "" && selectedDisciplina !== undefined) body.disciplina = { id: selectedDisciplina }; const res = await fetch(`${BASE_URL}/reserva/normal`, { method: "POST", headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) }, body: JSON.stringify(body) }); const text = await res.text(); const data = text ? JSON.parse(text) : null; if (!res.ok) { setOpenDialogCadastro(false); resetCadastroDialog(); setErrorMessage(data?.errors?.join?.(", ") || data?.message || "Erro ao criar reserva"); return; } if (selectedLab) fetchReservasPorLab(selectedLab); setOpenDialogCadastro(false); resetCadastroDialog(); } catch (err) { console.error(err); setOpenDialogCadastro(false); resetCadastroDialog(); setErrorMessage("Erro de conexão com o servidor"); } };

    const handleCancelarReserva = async () => { if (!selectedReserva) return; try { const res = await fetch(`${BASE_URL}/reserva/${selectedReserva.id}/cancelar`, { method: "PUT", headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" } }); if (!res.ok) { let errMsg = "Erro ao cancelar reserva"; try { const text = await res.text(); const data = text ? JSON.parse(text) : null; errMsg = data?.message || data?.error || errMsg; } catch { } setErrorMessage(errMsg); return; } if (selectedReserva.laboratorio?.id) fetchReservasPorLab(selectedReserva.laboratorio.id); setSelectedReserva(null); setOpenDialogDetalhes(false); } catch (err) { console.error("Erro ao cancelar reserva", err); setErrorMessage("Erro ao cancelar reserva"); } };

    const handleCancelarReservaFixa = async () => { if (!selectedReserva) return; try { const dateToSend = dataSelecionada || (selectedReserva.dataInicio ? selectedReserva.dataInicio.split("T")[0] : null); const body = { reservaFixaId: selectedReserva.id, data: dateToSend, tipo: "CANCELADA", motivo: "Cancelamento via Front" }; const res = await fetch(`${BASE_URL}/reserva/fixa/excecao/cancelar`, { method: "POST", headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!res.ok) { let errMsg = "Erro ao cancelar reserva fixa"; try { const text = await res.text(); const data = text ? JSON.parse(text) : null; errMsg = data?.message || data?.error || errMsg; } catch { } setErrorMessage(errMsg); return; } if (selectedReserva.laboratorio?.id) fetchReservasPorLab(selectedReserva.laboratorio.id); setSelectedReserva(null); setOpenDialogDetalhes(false); } catch (err) { console.error("Erro ao cancelar reserva fixa", err); setErrorMessage("Erro ao cancelar reserva fixa"); } };

    const handleConfirmarReservaFixa = async () => { if (!selectedReserva) return; try { const dateToSend = dataSelecionada || (selectedReserva.dataInicio ? selectedReserva.dataInicio.split("T")[0] : null); const body = { reservaFixaId: selectedReserva.id, data: dateToSend, tipo: "CONFIRMADA", motivo: "Confirmação via Front" }; setLoading(true); const res = await fetch(`${BASE_URL}/reserva/fixa/excecao/confirmar`, { method: "POST", headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!res.ok) { let errMsg = "Erro ao confirmar reserva fixa"; try { const text = await res.text(); const data = text ? JSON.parse(text) : null; errMsg = data?.message || data?.error || errMsg; } catch { } setErrorMessage(errMsg); return; } if (selectedReserva.laboratorio?.id) fetchReservasPorLab(selectedReserva.laboratorio.id); setSelectedReserva(null); setOpenDialogDetalhes(false); } catch (err) { console.error("Erro ao confirmar reserva fixa", err); setErrorMessage("Erro ao confirmar reserva fixa"); } finally { setLoading(false); } };

    const handleAprovarReserva = async () => { if (!selectedReserva) return; try { const res = await fetch(`${BASE_URL}/reserva/${selectedReserva.id}/aprovar`, { method: "PUT", headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" } }); if (!res.ok) { let errMsg = "Erro ao aprovar reserva"; try { const text = await res.text(); const data = text ? JSON.parse(text) : null; errMsg = data?.message || data?.error || errMsg; } catch { } setErrorMessage(errMsg); return; } if (selectedReserva.laboratorio?.id) fetchReservasPorLab(selectedReserva.laboratorio.id); setSelectedReserva(null); setOpenDialogDetalhes(false); } catch (err) { console.error("Erro ao aprovar reserva", err); setErrorMessage("Erro ao aprovar reserva"); } };

    function podeCancelar(reserva: Reserva | null): boolean { if (!reserva) return false; const decoded = parseJwt(TOKEN); const userRoles = decoded?.roles || decoded?.authorities || []; const userLogin = decoded?.sub; const isAdmin = userRoles.some((r: string) => r.toUpperCase() === "ADMIN"); const isProf = userRoles.some((r: string) => r.toUpperCase() === "PROF"); const isProfComp = userRoles.some((r: string) => r.toUpperCase() === "PROF_COMP"); if (isAdmin) return true; const reservaUser = reserva.usuario; if (!reservaUser) return false; const reservaRoles = reservaUser.roles?.map((r) => r.toUpperCase()) || []; if (isProf) return reservaUser.login === userLogin; if (isProfComp) return reservaRoles.includes("PROF_COMP") || reservaRoles.includes("PROF"); return false; }

    const getDisplayStatus = (): string => { if (!selectedReserva) return "-"; if (selectedReserva.status) return selectedReserva.status; if (selectedReserva.tipo === "FIXA") { const occurrenceDate = dataSelecionada || (selectedReserva.dataInicio ? new Date(selectedReserva.dataInicio).toISOString().split("T")[0] : ""); if (occurrenceDate) { const match = reservas.find(r => r.id === selectedReserva.id && r.dataInicio && r.dataInicio.startsWith(occurrenceDate)); if (match && match.status) return match.status; } } return "-"; };

    const renderEventContent = (eventInfo: any) => {
        const { event } = eventInfo;
        const bgColor = (event && (event.backgroundColor as string)) ?? "#6366f1";
        const reserva: Reserva | undefined = event.extendedProps?.reserva;

        const startHour = event.start ? event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
        const endHour = event.end ? event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

        const uniqueId = event.id ?? `ev-${reserva?.id ?? Math.random()}`;

        const openAnchoredPopup = (clientX: number, clientY: number) => {
            const OFFSET = 8;
            let x = clientX;
            let y = clientY - OFFSET;
            const vw = window.innerWidth;
            const popupWidth = 220;
            const popupHeight = 72;

            if (x + popupWidth / 2 > vw) x = vw - popupWidth / 2 - 8;
            if (x - popupWidth / 2 < 0) x = popupWidth / 2 + 8;
            if (y - popupHeight < 8) { y = clientY + OFFSET + popupHeight / 2; }

            setLongPressPopup({ visible: true, nome: reserva?.usuario?.nome ?? event.title, x, y, color: bgColor });
            window.setTimeout(() => setLongPressPopup((s) => ({ ...s, visible: false })), 2500);
            longPressFiredRef.current = true;
            window.setTimeout(() => { longPressFiredRef.current = false; }, 120);
        };

        const onTouchStart = (e: React.TouchEvent) => {
            if (!reserva) return;
            const touch = e.touches && e.touches[0];
            const startX = touch ? touch.clientX : 0;
            const startY = touch ? touch.clientY : 0;
            const t = window.setTimeout(() => { openAnchoredPopup(startX, startY); longPressTimeouts.current[uniqueId] = null; }, 600);
            longPressTimeouts.current[uniqueId] = t;
        };

        const clearTouchTimeout = () => { const t = longPressTimeouts.current[uniqueId]; if (t) { window.clearTimeout(t); longPressTimeouts.current[uniqueId] = null; } };
        const onTouchEnd = clearTouchTimeout;
        const onTouchCancel = clearTouchTimeout;

        const onMouseDown = (e: React.MouseEvent) => { if (!reserva) return; const startX = e.clientX; const startY = e.clientY; const t = window.setTimeout(() => { openAnchoredPopup(startX, startY); longPressTimeouts.current[uniqueId] = null; }, 700); longPressTimeouts.current[uniqueId] = t; };
        const onMouseUp = () => { const t = longPressTimeouts.current[uniqueId]; if (t) { window.clearTimeout(t); longPressTimeouts.current[uniqueId] = null; } };

        if (isMobile) {
            // Mobile: exibir apenas um bloco colorido (sem texto) para economizar espaço
            return (
                <div
                    role="button"
                    aria-label={event.title}
                    className="w-full h-8 rounded-lg"
                    style={{ backgroundColor: bgColor }}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    onTouchCancel={onTouchCancel}
                />
            );
        }

        // Desktop / tablet: conteúdo completo dentro do evento
        return (
            <div
                className={`w-full block rounded-lg px-2 py-1 text-white flex flex-col shadow-md ${isMobile ? 'gap-0.5 py-1' : 'gap-1 py-2'}`}
                style={{ backgroundColor: bgColor }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onTouchCancel={onTouchCancel}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
            >
                {!isMobile && (
                    <span className="text-[11px] font-semibold leading-tight">{startHour}{endHour ? ` - ${endHour}` : ""}</span>
                )}
                <span className={`text-[12px] font-semibold truncate ${isMobile ? 'text-sm' : ''}`}>{reserva?.usuario?.nome ?? event.title}</span>
                <span className={`text-[11px] truncate ${isMobile ? 'text-xs opacity-95' : ''}`}>{reserva?.laboratorio?.nome ?? ''}{reserva?.disciplina?.nome && (<> — <span className="italic">{reserva.disciplina.nome}</span></>)}</span>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}

            <div className="flex-1 flex flex-col min-h-screen">
                <Header titulo="Calendário de Reservas" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 p-3 sm:p-6 md:p-8 w-full">
                    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <select className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedLab} onChange={(e) => setSelectedLab(e.target.value === "" ? "" : Number(e.target.value))}>
                                <option value="">Selecione um laboratório</option>
                                {laboratorios.map((l) => (<option key={l.id} value={l.id}>{l.nome}</option>))}
                            </select>
                            <Button className="sm:w-auto" onClick={() => { if (!selectedLab) setErrorMessage("Selecione um laboratório."); else fetchReservasPorLab(selectedLab); }}>Pesquisar</Button>
                            {loading && <span className="text-gray-500 ml-auto">Carregando reservas...</span>}
                        </div>

                        <div className="w-full overflow-hidden">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                locale={ptBrLocale}
                                firstDay={1}
                                headerToolbar={isMobile ? { left: "prev,next", center: "title", right: "timeGridWeek" } : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
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

            {longPressPopup.visible && longPressPopup.x != null && longPressPopup.y != null && (
                <div
                    className="fixed z-50 rounded-xl shadow-lg px-4 py-2 border"
                    style={{ left: longPressPopup.x, top: longPressPopup.y, transform: 'translate(-50%, -100%)', backgroundColor: longPressPopup.color || '#fff', borderColor: 'rgba(0,0,0,0.08)' }}
                >
                    <div style={{ color: getContrastColor(longPressPopup.color), fontWeight: 600 }}>{longPressPopup.nome}</div>
                </div>
            )}

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
                                        {selectedReserva.disciplina && (<div><strong>Disciplina:</strong> {selectedReserva.disciplina.nome}{selectedReserva.disciplina.descricao ? ` — ${selectedReserva.disciplina.descricao}` : ""}</div>)}
                                        <div><strong>Status:</strong> {getDisplayStatus()}</div>
                                        {selectedReserva.dataInicio ? (<div><strong>Início:</strong> {selectedReserva.dataInicio} <br /><strong>Fim:</strong> {selectedReserva.dataFim ?? "-"}</div>) : (<div><strong>Recorrência:</strong> dia {selectedReserva.diaSemana ?? "-"} — {selectedReserva.horaInicio ?? "-"} até {selectedReserva.horaFim ?? "-"}</div>)}
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
                                <>{selectedReserva?.tipo === "NORMAL" ? (<Button variant="destructive" onClick={handleCancelarReserva}>Cancelar Reserva</Button>) : selectedReserva?.tipo === "FIXA" ? (<Button variant="destructive" onClick={handleCancelarReservaFixa}>Cancelar Reserva Fixa</Button>) : null}</>
                            )}
                            {(roles.includes("ADMIN") || roles.includes("PROF_COMP")) && selectedReserva?.tipo === "FIXA" && getDisplayStatus() !== "CONFIRMADA" && (
                                <Button onClick={handleConfirmarReservaFixa} disabled={loading} className="bg-violet-300 hover:bg-violet-400 text-white">{loading ? "Processando..." : "Confirmar utilização"}</Button>
                            )}
                            {roles.includes("ADMIN") && selectedReserva?.tipo === "NORMAL" && selectedReserva?.status !== "APROVADA" && (<Button variant="secondary" onClick={handleAprovarReserva}>Aprovar Reserva</Button>)}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1">Disciplina (opcional)</label>
                                        <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedDisciplina} onChange={(e) => setSelectedDisciplina(e.target.value === "" ? "" : Number(e.target.value))} disabled={!selectedUser || disciplinasAtuais.length === 0}>
                                            <option value="">Nenhuma disciplina</option>
                                            {disciplinasAtuais.map((d) => (<option key={d.id} value={d.id}>{d.nome}{d.descricao ? ` — ${d.descricao}` : ""}</option>))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Opcional — associar a reserva a uma disciplina (se aplicável).</p>
                                    </div>
                                    <select className="border rounded-lg px-3 py-2 w-full bg-gray-100 cursor-not-allowed" value={selectedLab} disabled>
                                        <option value="">{selectedLab ? laboratorios.find((l) => l.id === selectedLab)?.nome || "Laboratório selecionado" : "Nenhum laboratório selecionado"}</option>
                                    </select>
                                    <select className="border rounded-lg px-3 py-2 w-full bg-gray-100 cursor-not-allowed" value={selectedSemestre} disabled>
                                        <option value="">{semestreEncontrado ? semestreEncontrado.descricao || `${semestreEncontrado.dataInicio} - ${semestreEncontrado.dataFim}` : (selectedSemestre ? semestres.find((s) => s.id === selectedSemestre)?.descricao || "Semestre selecionado" : "Nenhum semestre encontrado")}</option>
                                    </select>
                                    <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedSemestre} onChange={(e) => setSelectedSemestre(Number(e.target.value))} style={{ display: 'none' }}>
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

            <style jsx>{`
                .fc .fc-toolbar-title { font-weight: 700; font-size: 1.25rem; }
                @media (max-width: 640px) {
                    .fc .fc-toolbar-title { font-size: 1rem; line-height: 1.1; }
                    .fc .fc-toolbar-chunk { gap: 0.25rem; display: flex; align-items: center; flex-wrap: nowrap; }
                    .fc .fc-button { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
                    .fc .fc-col-header-cell-cushion { font-size: 0.72rem; }
                    .fc .fc-daygrid-day-top { font-size: 0.72rem; }
                    .fc .fc-scroller { -webkit-overflow-scrolling: touch; }
                }
            `}</style>
        </div>
    );
}
