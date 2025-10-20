"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import Sidebar from "../components/Sidebar";
import { Menu } from "lucide-react";

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

interface Usuario { id: string; login: string; nome: string; roles?: string[]; disciplinas?: any[]; }
interface Laboratorio { id: number; nome: string; }
interface Semestre { id: number; dataInicio: string; dataFim: string; descricao?: string; }
interface ReservaFixa {
    id: number;
    dataInicio: string;
    dataFim: string;
    diaSemana: number | null;
    horaInicio: string | null;
    horaFim: string | null;
    usuario: Usuario;
    laboratorio: Laboratorio;
    semestre: Semestre;
    tipo?: string;
    status?: string;
    disciplina?: { id?: number; nome?: string; descricao?: string } | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ReservasFixasPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reservasFixas, setReservasFixas] = useState<ReservaFixa[]>([]);
    const [eventsState, setEventsState] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(false);
    const [openDialogCadastro, setOpenDialogCadastro] = useState(false);

    const [openDialogDetalhes, setOpenDialogDetalhes] = useState(false);
    const [selectedReserva, setSelectedReserva] = useState<ReservaFixa | null>(null);

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
    const [semestres, setSemestres] = useState<Semestre[]>([]);

    // guarda o semestre "encontrado" (por data)
    const [semestreEncontrado, setSemestreEncontrado] = useState<Semestre | null>(null);

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedLab, setSelectedLab] = useState<number | "">("");
    const [selectedSemestre, setSelectedSemestre] = useState<number | "">("");
    const [diaSemana, setDiaSemana] = useState<number>(1);
    const [horaInicio, setHoraInicio] = useState<string>("08:00");
    const [horaFim, setHoraFim] = useState<string>("10:00");

    const [errorMessage, setErrorMessage] = useState<string>("");

    const calendarRef = useRef<any>(null);
    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const resetCadastroDialog = () => {
        // NÃO resetar selectedLab nem selectedSemestre para preservar as escolhas do usuário
        setSelectedUser("");
        // setSelectedLab(""); <- intentionally removed: keep lab selecionado
        // setSelectedSemestre(""); <- intentionally removed: keep semestre selecionado
        setDiaSemana(1);
        setHoraInicio("08:00");
        setHoraFim("10:00");
        setSemestreEncontrado(null);
    };

    const fetchSelects = async () => {
        try {
            const urlProf = `${BASE_URL}/usuarios/professores-comp`;
            const urlLabs = `${BASE_URL}/laboratorios`;
            const urlSem = `${BASE_URL}/semestre`;

            try {
                const curlProf = `curl -X GET "${urlProf}" \\
  -H "Content-Type: application/json"${TOKEN ? ` \\
  -H "Authorization: Bearer ${TOKEN}"` : ""}`;
                const curlLabs = `curl -X GET "${urlLabs}" \\
  -H "Content-Type: application/json"${TOKEN ? ` \\
  -H "Authorization: Bearer ${TOKEN}"` : ""}`;
                const curlSem = `curl -X GET "${urlSem}" \\
  -H "Content-Type: application/json"${TOKEN ? ` \\
  -H "Authorization: Bearer ${TOKEN}"` : ""}`;

                console.info("🔍 CURL (usuarios/professores):\n" + curlProf);
                console.info("🔍 CURL (laboratorios):\n" + curlLabs);
                console.info("🔍 CURL (semestre):\n" + curlSem);
            } catch (err) {
                console.warn("Não foi possível montar CURLs de debug para selects:", err);
            }

            const [resProfessores, resLabs, resSemestres] = await Promise.all([
                fetch(urlProf, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(urlLabs, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
                fetch(urlSem, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined }),
            ]);

            const professoresData = await resProfessores.json().catch(() => []);
            const laboratoriosData = await resLabs.json().catch(() => []);
            const semestresData = await resSemestres.json().catch(() => []);

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

    // quando os semestres forem carregados, tenta encontrar o semestre que contém a data atual
    useEffect(() => {
        if (!semestres || semestres.length === 0) return;
        try {
            const hoje = new Date();
            const found = semestres.find((s) => {
                const start = new Date(s.dataInicio);
                const end = new Date(s.dataFim);
                return start <= hoje && hoje <= end;
            }) || null;
            setSemestreEncontrado(found);
            // se encontrou, define selectedSemestre apenas se ainda estiver vazio
            if (!selectedSemestre && found) setSelectedSemestre(found.id);
        } catch (err) {
            console.warn('Erro ao encontrar semestre por data:', err);
        }
    }, [semestres]);

    // busca todas reservas fixas — aceita labIdParam opcional (se não informado usa selectedLab)
    const fetchTodasReservasFixas = async (labIdParam?: number | "") => {
        const labId = typeof labIdParam !== "undefined" ? labIdParam : selectedLab;
        if (!labId) {
            setReservasFixas([]);
            setEventsState([]);
            return;
        }
        setLoading(true);
        try {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const dataInicioStr = startOfWeek.toISOString().slice(0, 19);
            const dataFimStr = endOfWeek.toISOString().slice(0, 19);

            const url = `${BASE_URL}/reserva/laboratorio/${Number(labId)}/periodo/fixas/todas?dataInicio=${dataInicioStr}&dataFim=${dataFimStr}`;

            try {
                const curlCommand = `curl -X GET "${url}" \\
  -H "Content-Type: application/json"${TOKEN ? ` \\
  -H "Authorization: Bearer ${TOKEN}"` : ""}`;
                console.info("🔍 CURL equivalente:\n", curlCommand);
            } catch (err) {
                console.warn("Não foi possível montar CURL de debug para reservas fixas:", err);
            }

            const res = await fetch(url, {
                headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
            });

            const text = await res.text();
            const data: ReservaFixa[] = text ? JSON.parse(text) : [];
            setReservasFixas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar todas reservas fixas:", err);
            setErrorMessage("Erro ao carregar todas reservas fixas");
            setReservasFixas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodasReservasFixas();
    }, [selectedLab]);

    const mapReservasParaEventos = (lista: ReservaFixa[]): EventInput[] => {
        if (!Array.isArray(lista)) return [];
        return lista.map((reserva) => {
            let dia = reserva.diaSemana;
            let horaIni = reserva.horaInicio;
            let horaFi = reserva.horaFim;

            if (dia === null || !horaIni || !horaFi) {
                const dtInicio = new Date(reserva.dataInicio);
                const dtFim = new Date(reserva.dataFim);
                dia = dtInicio.getDay();
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

            try {
                const bodyString = JSON.stringify(body, null, 2);
                const safeBodyForShell = bodyString.replace(/'/g, "'\"'\"'");
                const authHeader = TOKEN ? `  -H \"Authorization: Bearer ${TOKEN}\" \n` : "";
                const curl = [
                    `curl -X POST "${BASE_URL}/reserva/fixa" \\`,
                    `  -H "Content-Type: application/json" \\`,
                    authHeader ? `${authHeader.trim()}` : "",
                    `  -d '${safeBodyForShell}'`
                ].filter(Boolean).join("\n");

                console.info("🧾 CURL equivalente (copiar/colar no terminal):\n" + curl);
            } catch (err) {
                console.warn("Não foi possível montar CURL de debug para criar reserva fixa:", err);
            }

            const res = await fetch(`${BASE_URL}/reserva/fixa`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
                body: JSON.stringify(body),
            });

            const text = await res.text();
            const data: ReservaFixa | null = text ? JSON.parse(text) : null;

            if (!res.ok) {
                setErrorMessage((data as any)?.errors?.join?.(", ") || "Erro ao criar reserva fixa");
                return;
            }

            // Optimistic: adiciona a reserva retornada imediatamente (se backend retornou o recurso)
            if (data && data.id) {
                setReservasFixas((prev) => {
                    const next = [data, ...prev];
                    setEventsState(mapReservasParaEventos(next));
                    return next;
                });
            }

            setOpenDialogCadastro(false);
            resetCadastroDialog();

            // Recarrega todas as reservas do laboratório que está selecionado (mantendo selectedLab)
            try {
                await fetchTodasReservasFixas(selectedLab);
            } catch (e) {
                console.warn("Erro ao recarregar reservas após criação:", e);
            }

        } catch (err) {
            console.error(err);
            setErrorMessage("Erro de conexão com o servidor");
        }
    };

    // Ao cancelar, faz a requisição de novo para o mesmo laboratório que estava selecionado
    const handleCancelarFixa = async (id?: number) => {
        if (!id) return;
        if (!TOKEN) {
            setErrorMessage("Usuário não autenticado");
            return;
        }

        // captura o laboratório selecionado no momento do clique (pode ser "" quando nenhum selecionado)
        const labNoMomento = selectedLab;

        setLoading(true);
        try {
            const url = `${BASE_URL}/reserva/${id}/cancelar/fixa/total`;

            // debug curl
            try {
                const curl = `curl -X PUT "${url}" \\
  -H "Authorization: Bearer ${TOKEN}"`;
                console.info(`🔍 CURL (cancelar fixa):\n${curl}`);
            } catch (e) { /* silent */ }

            const res = await fetch(url, {
                method: "PUT",
                headers: { Authorization: `Bearer ${TOKEN}` },
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                let data;
                try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
                const msg = data?.mensagem || data?.message || text || "Erro ao cancelar reserva fixa";
                setErrorMessage(msg);
                return;
            }

            // sucesso: fecha o dialog
            setOpenDialogDetalhes(false);
            setSelectedReserva(null);

            // REQUISIÇÃO ADICIONAL: recarrega as reservas do laboratório que estava selecionado
            try {
                await fetchTodasReservasFixas(labNoMomento);
            } catch (e) {
                console.warn("Erro ao recarregar reservas após cancelar:", e);
            }

        } catch (err) {
            console.error("Erro ao cancelar reserva fixa:", err);
            setErrorMessage("Falha na conexão ao cancelar reserva fixa");
        } finally {
            setLoading(false);
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

    const handleEventClick = async (clickInfo: any) => {
        const ext = clickInfo.event.extendedProps;
        let reserva: ReservaFixa | null = ext && ext.reserva ? (ext.reserva as ReservaFixa) : null;

        if (reserva) {
            if (!reserva.disciplina) {
                try {
                    const res = await fetch(`${BASE_URL}/reserva/${reserva.id}`, {
                        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                    });
                    if (res.ok) {
                        const text = await res.text();
                        const data = text ? JSON.parse(text) : null;
                        if (data) reserva = data;
                    }
                } catch (err) {
                    console.warn("Não foi possível buscar reserva detalhada:", err);
                }
            }
        }

        setSelectedReserva(reserva);
        setOpenDialogDetalhes(true);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="p-4 bg-white/70 backdrop-blur-lg md:hidden flex items-center shadow-lg sticky top-0 z-10 border-b border-white/20">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 p-2 rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="ml-3 font-bold text-lg text-gray-800">Sistema de Reservas</h1>
                </header>

                <main className="flex-1 p-3 sm:p-6 md:p-8 w-full">
                    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <select className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedLab} onChange={(e) => setSelectedLab(e.target.value === "" ? "" : Number(e.target.value))}>
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
                            locale={ptBrLocale}
                            firstDay={1}
                            buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia", list: "Lista" }}
                            headerToolbar={false}
                            events={eventsState}
                            eventContent={renderEventContent}
                            eventClick={handleEventClick}
                            slotMinTime="07:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            height="80vh"
                        />
                    </div>
                </main>
            </div>

            {/* Dialog de cadastro */}
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

                                {/* se encontramos um semestre pela data atual, mostramos apenas essa opção e desabilitamos o select */}
                                {semestreEncontrado ? (
                                    <select className="border rounded-lg px-3 py-2 w-full bg-gray-100 cursor-not-allowed" value={selectedSemestre} disabled>
                                        <option value="">{semestreEncontrado.descricao || `${semestreEncontrado.dataInicio} - ${semestreEncontrado.dataFim}`}</option>
                                    </select>
                                ) : (
                                    <select className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" value={selectedSemestre} onChange={(e) => setSelectedSemestre(Number(e.target.value))}>
                                        <option value="">Selecione o semestre</option>
                                        {semestres.map((s) => (<option key={s.id} value={s.id}>{s.descricao}</option>))}
                                    </select>
                                )}

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

            {/* DIALOG DE DETALHES: abre ao clicar na reserva */}
            <Dialog open={openDialogDetalhes} onOpenChange={(open) => setOpenDialogDetalhes(open)}>
                <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Reserva Fixa</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2 mt-2">
                                {selectedReserva ? (
                                    <>
                                        <div><strong>Usuário:</strong> {selectedReserva.usuario?.nome} ({selectedReserva.usuario?.login})</div>
                                        <div><strong>Laboratório:</strong> {selectedReserva.laboratorio?.nome}</div>
                                        {selectedReserva.disciplina && (
                                            <div><strong>Disciplina:</strong> {selectedReserva.disciplina.nome}{selectedReserva.disciplina.descricao ? ` — ${selectedReserva.disciplina.descricao}` : ""}</div>
                                        )}
                                        <div><strong>Status:</strong> {selectedReserva.status ?? "-"}</div>
                                        {selectedReserva.dataInicio ? (
                                            <div><strong>Início:</strong> {selectedReserva.dataInicio} <br /><strong>Fim:</strong> {selectedReserva.dataFim ?? "-"}</div>
                                        ) : (
                                            <div><strong>Recorrência:</strong> dia {selectedReserva.diaSemana ?? "-"} — {selectedReserva.horaInicio ?? "-"} até {selectedReserva.horaFim ?? "-"}</div>
                                        )}
                                        <div><strong>Semestre:</strong> {selectedReserva.semestre?.descricao ?? "-"}</div>
                                    </>
                                ) : (
                                    <div>Reserva não encontrada</div>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button variant="destructive"
                            onClick={() => handleCancelarFixa(selectedReserva?.id ?? undefined)}
                            disabled={loading || !selectedReserva}
                        >
                            {loading ? "Processando..." : "Cancelar reserva"}
                        </Button>

                        <Button onClick={() => { setOpenDialogDetalhes(false); setSelectedReserva(null); }}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ErrorAlert message={errorMessage} onClose={() => setErrorMessage("")} />
        </div>
    );
}
