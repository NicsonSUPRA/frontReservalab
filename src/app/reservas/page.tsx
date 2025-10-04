// src/app/reservas/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
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
interface Semestre { id: number; dataInicio: string; dataFim: string; ano?: number; periodo?: number; descricao?: string; }
interface Reserva {
    id: number;
    dataInicio: string | null;
    dataFim: string | null;
    status: string;
    tipo?: string | null;
    diaSemana: number | null;
    horaInicio: string | null;
    horaFim: string | null;
    ativo: boolean;
    usuario: Usuario;
    laboratorio: Laboratorio;
    semestre: Semestre;
}

export default function ReservasPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [eventsState, setEventsState] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(true);
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
        setHoraInicio("08:00");
        setHoraFim("10:00");
        setDataSelecionada("");
    };

    useEffect(() => {
        // Fetch reservas do laboratório 2 (datas no formato ISO local)
        const fetchReservasLab2 = async () => {
            setLoading(true);
            try {
                const dataInicio = "2025-09-01T00:00:00";
                const dataFim = "2025-12-31T23:59:59";
                const url = `${BASE_URL}/reserva/laboratorio/2/periodo?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;

                console.log(`curl -X GET "${url}" \\
-H "Authorization: Bearer ${TOKEN}"`);

                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${TOKEN}` },
                });

                console.log("Status:", res.status, res.statusText);

                const data = await res.json();
                console.log("Resposta do endpoint:", data);

                setReservas(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Erro ao carregar reservas do laboratório 2:", err);
                setErrorMessage("Erro ao carregar reservas do laboratório 2");
                setReservas([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchSelects = async () => {
            try {
                const [resUsuarios, resLabs, resSemestres] = await Promise.all([
                    fetch(`${BASE_URL}/usuarios`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
                    fetch(`${BASE_URL}/laboratorios`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
                    fetch(`${BASE_URL}/semestre`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
                ]);

                const usuariosData = await resUsuarios.json();
                const laboratoriosData = await resLabs.json();
                const semestresData = await resSemestres.json();

                setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
                setLaboratorios(Array.isArray(laboratoriosData) ? laboratoriosData : []);
                setSemestres(Array.isArray(semestresData) ? semestresData : []);
            } catch (err) {
                console.error("Erro ao buscar selects:", err);
                setErrorMessage("Erro ao buscar dados para o formulário");
            }
        };

        fetchReservasLab2();
        fetchSelects();
    }, []);

    // Função que mapeia as reservas para EventInput do FullCalendar
    const mapReservasParaEventos = (lista: Reserva[]): EventInput[] => {
        if (!Array.isArray(lista)) return [];

        const mapped: EventInput[] = lista.flatMap((reserva) => {
            const color =
                reserva.status === "APROVADA"
                    ? "#16a34a"
                    : reserva.status === "PENDENTE"
                        ? "#f59e0b"
                        : reserva.status === "FIXA"
                            ? "#22c55e"
                            : "#6366f1";

            const outputs: EventInput[] = [];

            // Recorrente / fixa (daysOfWeek)
            if (!reserva.dataInicio && reserva.diaSemana !== null && reserva.horaInicio) {
                // Se backend usa 1..7 (segunda..domingo), mapeia para 0..6 onde 0=domingo
                // Aqui usamos modulo para tratar 7 -> 0
                const dayNum = Number(reserva.diaSemana);
                const dayForFullCalendar = Number.isFinite(dayNum) ? (dayNum % 7) : dayNum;

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

            // Evento normal com data específica
            if (reserva.dataInicio) {
                outputs.push({
                    id: `normal-${reserva.id}`,
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

        console.log(`Mapeadas ${mapped.length} events a partir de ${lista.length} reservas.`);
        return mapped;
    };

    // Reconstrói eventsState sempre que reservas mudam
    useEffect(() => {
        const evts = mapReservasParaEventos(reservas);
        setEventsState(evts);
    }, [reservas]);

    const handleEventClick = (clickInfo: any) => {
        // pega reserva direto de extendedProps (muito mais confiável)
        const ext = clickInfo.event.extendedProps;
        if (ext && ext.reserva) {
            setSelectedReserva(ext.reserva as Reserva);
            console.log("Evento clicado - reserva via extendedProps:", ext.reserva);
        } else {
            // fallback seguro (remove prefixo se existir)
            const rawId = String(clickInfo.event.id || "");
            const numeric = rawId.replace(/^(fixa-|normal-)/, "");
            const r = reservas.find((x) => String(x.id) === numeric) ?? null;
            setSelectedReserva(r);
            console.log("Evento clicado - fallback reserva:", r);
        }

        setOpenDialogDetalhes(true);
    };

    const handleDateClick = (info: any) => {
        setDataSelecionada(info.dateStr.split("T")[0]);
        setOpenDialogCadastro(true);
    };

    const handleSalvarReserva = async () => {
        try {
            const body = {
                usuarioId: selectedUser,
                laboratorioId: selectedLab,
                semestreId: selectedSemestre,
                dataInicio: `${dataSelecionada}T${horaInicio}`,
                dataFim: `${dataSelecionada}T${horaFim}`,
                status: "PENDENTE",
            };

            console.log(`curl -X POST "${BASE_URL}/reserva/normal" \\
-H "Authorization: Bearer ${TOKEN}" \\
-H "Content-Type: application/json" \\
-d '${JSON.stringify(body, null, 2)}'`);

            const res = await fetch(`${BASE_URL}/reserva/normal`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TOKEN}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setOpenDialogCadastro(false);
                resetCadastroDialog();
                setErrorMessage(data.errors?.join(", ") || "Erro ao criar reserva");
                return;
            }

            // atualiza reservas (isso acionará a reconstrução de eventsState via useEffect acima)
            setReservas((prev) => Array.isArray(prev) ? [...prev, data] : [data]);
            setOpenDialogCadastro(false);
            resetCadastroDialog();
        } catch (err) {
            console.error(err);
            setOpenDialogCadastro(false);
            resetCadastroDialog();
            setErrorMessage("Erro de conexão com o servidor");
        }
    };

    const renderEventContent = (eventInfo: any) => {
        const { event, view } = eventInfo;
        const start = event.start as Date | null;
        const end = event.end as Date | null;

        const formatHour = (date: Date | null) => {
            if (!date) return "";
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        };

        const startHour = formatHour(start);
        const endHour = formatHour(end);
        const bgColor = (event.backgroundColor || event.borderColor || "#6366f1") as string;

        if (view.type === "dayGridMonth") {
            return (
                <div
                    className="w-full block rounded-md px-2 py-1 text-white text-[12px] font-semibold text-center"
                    style={{ backgroundColor: bgColor }}
                >
                    {startHour && endHour ? `${startHour} - ${endHour}` : startHour}
                </div>
            );
        }

        return (
            <div
                className="w-full block rounded-md px-2 py-1 text-white flex flex-col"
                style={{ backgroundColor: bgColor }}
            >
                <span className="text-[11px] leading-[1] font-semibold">{startHour}{endHour ? ` - ${endHour}` : ""}</span>
                <span className="text-[12px] truncate">{event.title}</span>
            </div>
        );
    };

    if (loading) return <div className="p-6">Carregando reservas...</div>;

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            <div className="flex-1 flex flex-col min-h-screen">
                <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-4 px-4 sm:px-6 flex items-center justify-between shadow-lg">
                    <h1 className="text-lg sm:text-xl font-semibold">Calendário de Reservas</h1>
                </div>

                <main className="flex-1 p-3 sm:p-6 md:p-8 w-full">
                    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-3 sm:p-6 border border-gray-100">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={{
                                left: "prev,next today",
                                center: "title",
                                right: "dayGridMonth,timeGridWeek,timeGridDay",
                            }}
                            events={eventsState}
                            eventClick={handleEventClick}
                            dateClick={handleDateClick}
                            eventContent={renderEventContent}
                            slotMinTime="07:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            height="80vh"
                        />
                    </div>
                </main>
            </div>

            {/* Dialog detalhes */}
            <Dialog open={openDialogDetalhes} onOpenChange={setOpenDialogDetalhes}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes da Reserva</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2">
                                {selectedReserva ? (
                                    <>
                                        <div><strong>Usuário:</strong> {selectedReserva.usuario?.nome} ({selectedReserva.usuario?.login})</div>
                                        <div><strong>Laboratório:</strong> {selectedReserva.laboratorio?.nome}</div>
                                        <div><strong>Status:</strong> {selectedReserva.status}</div>
                                        {selectedReserva.dataInicio ? (
                                            <div>
                                                <strong>Início:</strong> {selectedReserva.dataInicio} <br />
                                                <strong>Fim:</strong> {selectedReserva.dataFim ?? "-"}
                                            </div>
                                        ) : (
                                            <div>
                                                <strong>Recorrência:</strong> dia {selectedReserva.diaSemana} — {selectedReserva.horaInicio} até {selectedReserva.horaFim ?? "-"}
                                            </div>
                                        )}
                                        <div><strong>Semestre:</strong> {selectedReserva.semestre?.descricao ?? "-"}</div>
                                    </>
                                ) : <div>Reserva não encontrada</div>}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setOpenDialogDetalhes(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog cadastro */}
            <Dialog
                open={openDialogCadastro}
                onOpenChange={(open) => {
                    setOpenDialogCadastro(open);
                    if (!open) resetCadastroDialog();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Reserva</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3">
                                {dataSelecionada && (
                                    <div className="p-2 bg-gray-100 rounded">
                                        <strong>Data selecionada:</strong> {dataSelecionada}
                                    </div>
                                )}
                                <div>
                                    <label>Hora Início:</label>
                                    <input
                                        type="time"
                                        className="border p-2 rounded w-full"
                                        value={horaInicio}
                                        onChange={(e) => setHoraInicio(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label>Hora Fim:</label>
                                    <input
                                        type="time"
                                        className="border p-2 rounded w-full"
                                        value={horaFim}
                                        onChange={(e) => setHoraFim(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label>Usuário:</label>
                                    <select
                                        className="border p-2 rounded w-full"
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                    >
                                        <option value="">Selecione</option>
                                        {usuarios.map((u) => (
                                            <option key={u.id} value={u.id}>{u.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Laboratório:</label>
                                    <select
                                        className="border p-2 rounded w-full"
                                        value={selectedLab}
                                        onChange={(e) => setSelectedLab(Number(e.target.value))}
                                    >
                                        <option value="">Selecione</option>
                                        {laboratorios.map((l) => (
                                            <option key={l.id} value={l.id}>{l.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Semestre:</label>
                                    <select
                                        className="border p-2 rounded w-full"
                                        value={selectedSemestre}
                                        onChange={(e) => setSelectedSemestre(Number(e.target.value))}
                                    >
                                        <option value="">Selecione</option>
                                        {semestres.map((s) => (
                                            <option key={s.id} value={s.id}>{s.descricao}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={handleSalvarReserva}>Salvar Reserva</Button>
                        <Button variant="ghost" onClick={() => setOpenDialogCadastro(false)}>Cancelar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ErrorAlert message={errorMessage} onClose={() => setErrorMessage("")} />
        </div>
    );
}
