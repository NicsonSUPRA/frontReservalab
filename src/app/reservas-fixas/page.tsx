"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
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
interface ReservaFixa {
    id: number;
    dataInicio: string;
    dataFim: string;
    diaSemana: number | null; // 0=domingo, 1=segunda ...
    horaInicio: string | null;
    horaFim: string | null;
    usuario: Usuario;
    laboratorio: Laboratorio;
    semestre: Semestre;
    tipo?: string;
    status?: string;
}

export default function ReservasFixasPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reservasFixas, setReservasFixas] = useState<ReservaFixa[]>([]);
    const [eventsState, setEventsState] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(false);
    const [openDialogCadastro, setOpenDialogCadastro] = useState(false);

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
    const [semestres, setSemestres] = useState<Semestre[]>([]);

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedLab, setSelectedLab] = useState<number | "">("");
    const [selectedSemestre, setSelectedSemestre] = useState<number | "">("");
    const [diaSemana, setDiaSemana] = useState<number>(1);
    const [horaInicio, setHoraInicio] = useState<string>("08:00");
    const [horaFim, setHoraFim] = useState<string>("10:00");

    const [errorMessage, setErrorMessage] = useState<string>("");

    const calendarRef = useRef<any>(null);

    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const BASE_URL = "http://localhost:8080";

    const resetCadastroDialog = () => {
        setSelectedUser("");
        setSelectedLab("");
        setSelectedSemestre("");
        setDiaSemana(1);
        setHoraInicio("08:00");
        setHoraFim("10:00");
    };

    // -----------------------
    // Fetch selects (usuarios, laboratorios, semestres)
    // -----------------------
    const fetchSelects = async () => {
        try {
            const [resProfessores, resLabs, resSemestres] = await Promise.all([
                fetch(`${BASE_URL}/usuarios/professores`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(`${BASE_URL}/laboratorios`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(`${BASE_URL}/semestre`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
            ]);

            const professoresData = await resProfessores.json();
            const laboratoriosData = await resLabs.json();
            const semestresData = await resSemestres.json();

            setUsuarios(Array.isArray(professoresData) ? professoresData : []);
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
    // Buscar reservas fixas
    // -----------------------
    const fetchReservasFixas = async () => {
        if (!selectedLab) return;
        setLoading(true);

        try {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // domingo
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // sábado

            const dataInicioStr = startOfWeek.toISOString().slice(0, 19);
            const dataFimStr = endOfWeek.toISOString().slice(0, 19);

            console.log("URL:", `${BASE_URL}/reserva/laboratorio/${selectedLab}/periodo/fixas?dataInicio=${dataInicioStr}&dataFim=${dataFimStr}`);
            console.log("TOKEN:", `Bearer ${TOKEN}`);
            console.log("CURL equivalente:");
            console.log(`curl -X GET "${BASE_URL}/reserva/laboratorio/${selectedLab}/periodo/fixas?dataInicio=${dataInicioStr}&dataFim=${dataFimStr}" -H "Authorization: Bearer ${TOKEN}"`);

            const res = await fetch(`${BASE_URL}/reserva/laboratorio/${selectedLab}/periodo/fixas?dataInicio=${dataInicioStr}&dataFim=${dataFimStr}`, {
                headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
            });

            const text = await res.text();
            const data: ReservaFixa[] = text ? JSON.parse(text) : [];
            console.log("Dados brutos do backend:", data);
            setReservasFixas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar reservas fixas:", err);
            setErrorMessage("Erro ao carregar reservas fixas");
            setReservasFixas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservasFixas();
    }, [selectedLab]);

    // -----------------------
    // Mapear reservas fixas para eventos FullCalendar
    // -----------------------
    const mapReservasParaEventos = (lista: ReservaFixa[]): EventInput[] => {
        if (!Array.isArray(lista)) return [];
        return lista.map((reserva) => {
            // Se diaSemana ou horários forem nulos, calcular a partir de dataInicio/dataFim
            let dia = reserva.diaSemana;
            let horaIni = reserva.horaInicio;
            let horaFi = reserva.horaFim;

            if (dia === null || !horaIni || !horaFi) {
                const dtInicio = new Date(reserva.dataInicio);
                const dtFim = new Date(reserva.dataFim);
                dia = dtInicio.getDay(); // 0=domingo
                horaIni = dtInicio.toTimeString().slice(0, 5);
                horaFi = dtFim.toTimeString().slice(0, 5);
            }

            const color = reserva.status === "APROVADA" ? "#16a34a" : "#22c55e";

            return {
                id: `fixa-${reserva.id}`,
                title: `${reserva.usuario?.nome ?? "Usuário"} — ${reserva.laboratorio?.nome ?? "Lab"}`,
                daysOfWeek: [dia % 7],
                startTime: horaIni,
                endTime: horaFi,
                backgroundColor: color,
                borderColor: color,
                allDay: false,
                extendedProps: { reserva },
            };
        });
    };

    useEffect(() => {
        setEventsState(mapReservasParaEventos(reservasFixas));
    }, [reservasFixas]);

    // -----------------------
    // Salvar reserva fixa
    // -----------------------
    const handleSalvarReservaFixa = async () => {
        if (!selectedUser || !selectedLab || !selectedSemestre) {
            setErrorMessage("Preencha todos os campos obrigatórios.");
            return;
        }

        try {
            const body = {
                usuarioId: selectedUser,
                laboratorioId: selectedLab,
                semestreId: selectedSemestre,
                diaSemana,
                horaInicio,
                horaFim,
            };

            const res = await fetch(`${BASE_URL}/reserva/fixa`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
                body: JSON.stringify(body),
            });

            const text = await res.text();
            const data = text ? JSON.parse(text) : null;

            if (!res.ok) {
                setErrorMessage(data?.errors?.join?.(", ") || "Erro ao criar reserva fixa");
                return;
            }

            fetchReservasFixas();
            setOpenDialogCadastro(false);
            resetCadastroDialog();
        } catch (err) {
            console.error(err);
            setErrorMessage("Erro de conexão com o servidor");
        }
    };

    const renderEventContent = (eventInfo: any) => {
        const { event } = eventInfo;
        const startHour = event.startTime ?? "";
        const endHour = event.endTime ?? "";
        const bgColor = event.backgroundColor ?? "#6366f1";

        return (
            <div className="w-full block rounded-lg px-2 py-1 text-white flex flex-col shadow-md" style={{ backgroundColor: bgColor }}>
                <span className="text-[11px] font-semibold">{startHour}{endHour ? ` - ${endHour}` : ""}</span>
                <span className="text-[12px] truncate">{event.title}</span>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}

            <div className="flex-1 flex flex-col min-h-screen">
                <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-4 px-4 sm:px-6 flex items-center justify-between shadow-lg">
                    <h1 className="text-lg sm:text-xl font-semibold">Calendário de Reservas Fixas</h1>
                </div>

                <main className="flex-1 p-3 sm:p-6 md:p-8 w-full">
                    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <select className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedLab} onChange={(e) => setSelectedLab(Number(e.target.value))}>
                                <option value="">Selecione o laboratório</option>
                                {laboratorios.map((l) => (<option key={l.id} value={l.id}>{l.nome}</option>))}
                            </select>
                            <Button onClick={() => setOpenDialogCadastro(true)}>Nova Reserva Fixa</Button>
                            {loading && <span className="text-gray-500 ml-auto">Carregando reservas...</span>}
                        </div>

                        <FullCalendar
                            ref={calendarRef}
                            plugins={[timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={false} // fixo, sem navegação
                            events={eventsState}
                            eventContent={renderEventContent}
                            slotMinTime="07:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            height="80vh"
                        />
                    </div>
                </main>
            </div>

            {/* Dialog cadastro reserva fixa */}
            <Dialog open={openDialogCadastro} onOpenChange={(open) => { setOpenDialogCadastro(open); if (!open) resetCadastroDialog(); }}>
                <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Nova Reserva Fixa</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 mt-2">
                                <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                                    <option value="">Selecione o usuário</option>
                                    {usuarios.map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
                                </select>

                                <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedSemestre} onChange={(e) => setSelectedSemestre(Number(e.target.value))}>
                                    <option value="">Selecione o semestre</option>
                                    {semestres.map((s) => (<option key={s.id} value={s.id}>{s.descricao}</option>))}
                                </select>

                                <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
                                    <option value={1}>Segunda</option>
                                    <option value={2}>Terça</option>
                                    <option value={3}>Quarta</option>
                                    <option value={4}>Quinta</option>
                                    <option value={5}>Sexta</option>
                                    <option value={6}>Sábado</option>
                                    <option value={0}>Domingo</option>
                                </select>

                                <div className="flex gap-2">
                                    <input type="time" className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                                    <input type="time" className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="space-x-2">
                        <Button onClick={handleSalvarReservaFixa}>Salvar</Button>
                        <Button variant="ghost" onClick={() => setOpenDialogCadastro(false)}>Cancelar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ErrorAlert message={errorMessage} onClose={() => setErrorMessage("")} />
        </div>
    );
}
