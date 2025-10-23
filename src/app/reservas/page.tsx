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

interface Disciplina {
    id?: number;
    nome: string;
    descricao?: string;
    usuario?: { id: string } | null;
}

interface Usuario {
    id: string;
    login: string;
    nome: string;
    roles?: string[];
    disciplinas?: Disciplina[]; // ✅ usuário pode ter lista de disciplinas
}

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
    const [disciplinasGlobais, setDisciplinasGlobais] = useState<Disciplina[]>([]); // fallback global
    const [disciplinasAtuais, setDisciplinasAtuais] = useState<Disciplina[]>([]); // disciplinas mostradas no select

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
        // mantemos selectedLab e selectedSemestre conforme você pediu anteriormente
        setSemestreEncontrado(null);
        setHoraInicio("08:00");
        setHoraFim("10:00");
        setDataSelecionada("");
        setSelectedDisciplina("");
        setDisciplinasAtuais([]); // limpa disciplinas exibidas
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
    // Fetch selects (usuarios, labs, semestres e disciplinas globais)
    // -----------------------
    const fetchSelects = async () => {
        try {
            const decoded = parseJwt(TOKEN);
            const userRoles = decoded?.roles || decoded?.authorities || [];
            const userLogin = decoded?.sub;

            const requests = [
                fetch(`${BASE_URL}/usuarios/professores`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
                fetch(`${BASE_URL}/laboratorios`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
                fetch(`${BASE_URL}/semestre`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
                fetch(`${BASE_URL}/disciplinas`, {
                    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
                }),
            ];

            const [resProfessores, resLabs, resSemestres, resDisciplinas] = await Promise.all(requests);

            const professoresData = await resProfessores.json().catch(() => []);
            const laboratoriosData = await resLabs.json().catch(() => []);
            const semestresData = await resSemestres.json().catch(() => []);
            const disciplinasData = await resDisciplinas.json().catch(() => []);

            // filtragem de usuários baseada na role
            let usuariosFiltrados: Usuario[] = [];
            if (userRoles.some((r: string) => r.toUpperCase() === "ADMIN")) {
                usuariosFiltrados = professoresData;
            } else {
                usuariosFiltrados = (professoresData || []).filter((u: any) => u.login === userLogin);
            }

            setUsuarios(Array.isArray(usuariosFiltrados) ? usuariosFiltrados : []);
            setLaboratorios(Array.isArray(laboratoriosData) ? laboratoriosData : []);
            setSemestres(Array.isArray(semestresData) ? semestresData : []);
            setDisciplinasGlobais(Array.isArray(disciplinasData) ? disciplinasData : []);
        } catch (err) {
            console.error("Erro ao buscar selects:", err);
            setErrorMessage("Erro ao buscar dados para o formulário");
        }
    };

    useEffect(() => {
        fetchSelects();
    }, []);

    // -----------------------
    // Quando o usuário selecionado mudar, atualiza lista de disciplinas exibidas:
    // usa disciplinas do usuário (se existir) ou fallback para disciplinasGlobais filtradas pelo usuário.
    // -----------------------
    useEffect(() => {
        if (!selectedUser) {
            setDisciplinasAtuais([]);
            setSelectedDisciplina("");
            return;
        }

        const user = usuarios.find((u) => u.id === selectedUser);
        if (user && Array.isArray(user.disciplinas) && user.disciplinas.length > 0) {
            setDisciplinasAtuais(user.disciplinas);
        } else {
            // fallback: usa disciplinas globais, filtrando por disciplina.usuario se disponível
            const filtered = disciplinasGlobais.filter((d) => {
                if (!d.usuario) return true;
                return d.usuario.id === selectedUser;
            });
            setDisciplinasAtuais(filtered);
        }

        // reset selected disciplina quando troca de usuário
        setSelectedDisciplina("");
    }, [selectedUser, usuarios, disciplinasGlobais]);

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
            const isReservaFixa = reserva.tipo === "FIXA" ? true : false;
            const color: string = (isReservaFixa && reserva.status === null)
                ? "#22c55e" // Verde para FIXA com status null
                : reserva.status === "CONFIRMADA"
                    ? "#0c92b4ff" // AZUL para CONFIRMADA
                    : reserva.status === "APROVADA"
                        ? "#16a34a"
                        : reserva.status === "PENDENTE"
                            ? "#f59e0b"
                            : "#3537c2ff";


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

    // -----------------------
    // Ao clicar no evento: tenta garantir que selectedReserva tenha a disciplina associada.
    // Estratégia:
    // 1) se extendedProps.reserva já tem disciplina -> usa direto
    // 2) se não tem disciplina, mas usuario.disciplinas tem exatamente 1 -> usa como fallback
    // 3) se ainda não tiver -> tenta buscar /reserva/{id} no backend para obter dados completos
    // Além disso, coloca a data da ocorrência clicada em dataSelecionada (se disponível).
    // -----------------------
    const handleEventClick = async (clickInfo: any) => {
        const ext = clickInfo.event.extendedProps;
        let reserva: Reserva | null = ext && ext.reserva ? (ext.reserva as Reserva) : null;

        // tenta extrair a data da ocorrência clicada (FullCalendar fornece event.start para a ocorrência)
        const occurrenceDate = clickInfo.event.start ? new Date(clickInfo.event.start) : null;
        const occurrenceDateStr = occurrenceDate ? occurrenceDate.toISOString().split("T")[0] : "";

        if (reserva) {
            // fallback rápido: se o usuário só tem 1 disciplina, presume que é essa (útil quando a API não retorna disciplina)
            if (!reserva.disciplina && reserva.usuario?.disciplinas && reserva.usuario.disciplinas.length === 1) {
                reserva = { ...reserva, disciplina: reserva.usuario.disciplinas[0] };
            }

            // se ainda não tem disciplina, tenta buscar detalhe da reserva no backend
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
        // se a ocorrência clicada tem data, usamos ela para operações como cancelar exceção
        if (occurrenceDateStr) {
            setDataSelecionada(occurrenceDateStr);
        } else if (reserva?.dataInicio) {
            // fallback: se a reserva tiver dataInicio (reserva normal), guardamos ela
            const iso = new Date(reserva.dataInicio).toISOString().split("T")[0];
            setDataSelecionada(iso);
        } else {
            // caso contrário, limpa (o usuário pode selecionar data manualmente com dateClick)
            setDataSelecionada("");
        }

        setOpenDialogDetalhes(true);
    };

    // -----------------------
    // Buscar semestre por data (apenas loga o CURL do endpoint e retorna null)
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

            if (!selectedLab) {
                setErrorMessage("Laboratório inválido.");
                return;
            }

            const body: any = {
                usuarioId: selectedUser,
                laboratorioId: selectedLab,
                semestreId: selectedSemestre,
                dataInicio: `${dataSelecionada}T${horaInicio}`,
                dataFim: `${dataSelecionada}T${horaFim}`,
                status: "PENDENTE",
            };

            // incluir disciplina apenas se houver seleção
            if (selectedDisciplina !== "" && selectedDisciplina !== undefined) {
                body.disciplina = { id: selectedDisciplina };
            }

            // --- Gera e imprime o CURL equivalente ---
            try {
                const bodyString = JSON.stringify(body, null, 2); // formatado
                // Escapa eventuais aspas simples para shell (mais seguro)
                const safeBodyForShell = bodyString.replace(/'/g, "'\"'\"'");
                const authHeader = TOKEN ? `-H "Authorization: Bearer ${TOKEN}" \\n` : "";
                const curl = [
                    `curl -X POST "${BASE_URL}/reserva/normal" \\`,
                    `  -H "Content-Type: application/json" \\`,
                    authHeader ? `  ${authHeader.trim()}` : "",
                    `  -d '${safeBodyForShell}'`
                ].filter(Boolean).join("\n");
                // Imprime com separador para facilitar leitura no console do browser
                console.info("🧾 CURL equivalente (copiar/colar no terminal):\n" + curl);
            } catch (err) {
                console.warn("Não foi possível gerar o CURL legível:", err);
            }
            // ---------------------------------------

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
                setErrorMessage(data?.errors?.join?.(", ") || data?.message || "Erro ao criar reserva");
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
            // Monta e printa o CURL equivalente
            const curl = [
                `curl -X PUT "${BASE_URL}/reserva/${selectedReserva.id}/cancelar" \\`,
                `  -H "Content-Type: application/json" \\`,
                TOKEN ? `  -H "Authorization: Bearer ${TOKEN}"` : ""
            ].filter(Boolean).join("\n");

            console.info("🧾 CURL equivalente para debug:\n" + curl);

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


    // -----------------------
    // Cancelar reserva fixa (envia dataSelecionada)
    // -----------------------
    const handleCancelarReservaFixa = async () => {
        if (!selectedReserva) return;

        try {
            // Usa dataSelecionada (preenchida no dateClick ou eventClick), com fallback para dataInicio da reserva
            const dateToSend =
                dataSelecionada ||
                (selectedReserva.dataInicio ? selectedReserva.dataInicio.split("T")[0] : null);

            const body = {
                reservaFixaId: selectedReserva.id,
                data: dateToSend,
                tipo: "CANCELADA",
                motivo: "Cancelamento via Front"
            };

            // Monta e printa o CURL equivalente
            const bodyString = JSON.stringify(body, null, 2).replace(/'/g, "'\"'\"'");
            const curl = [
                `curl -X POST "${BASE_URL}/reserva/fixa/excecao/cancelar" \\`,
                `  -H "Content-Type: application/json" \\`,
                TOKEN ? `  -H "Authorization: Bearer ${TOKEN}" \\` : "",
                `  -d '${bodyString}'`
            ].filter(Boolean).join("\n");

            console.info("🧾 CURL equivalente para debug:\n" + curl);

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

            // limpa seleção de detalhe (mas preserva dataSelecionada caso queira cancelar outra ocorrência)
            setSelectedReserva(null);
            setOpenDialogDetalhes(false);
        } catch (err) {
            console.error("Erro ao cancelar reserva fixa", err);
            setErrorMessage("Erro ao cancelar reserva fixa");
        }
    };

    // -----------------------
    // Confirmar reserva fixa (envia dataSelecionada)
    // -----------------------
    const handleConfirmarReservaFixa = async () => {
        if (!selectedReserva) return;

        try {
            // Usa dataSelecionada (preenchida no dateClick ou eventClick), com fallback para dataInicio da reserva
            const dateToSend =
                dataSelecionada ||
                (selectedReserva.dataInicio ? selectedReserva.dataInicio.split("T")[0] : null);

            const body = {
                reservaFixaId: selectedReserva.id,
                data: dateToSend,
                tipo: "CONFIRMADA",
                motivo: "Confirmação via Front"
            };

            // Monta e printa o CURL equivalente (útil para debug)
            const bodyString = JSON.stringify(body, null, 2).replace(/'/g, "'\"'\"'");
            const curl = [
                `curl -X POST "${BASE_URL}/reserva/fixa/excecao/confirmar" \\`,
                `  -H "Content-Type: application/json" \\`,
                TOKEN ? `  -H "Authorization: Bearer ${TOKEN}" \\` : "",
                `  -d '${bodyString}'`
            ].filter(Boolean).join("\n");

            console.info("🧾 CURL equivalente para debug (confirmar):\n" + curl);

            setLoading(true);

            const res = await fetch(`${BASE_URL}/reserva/fixa/excecao/confirmar`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                let errMsg = "Erro ao confirmar reserva fixa";
                try {
                    const text = await res.text();
                    const data = text ? JSON.parse(text) : null;
                    errMsg = data?.message || data?.error || errMsg;
                } catch { }
                setErrorMessage(errMsg);
                return;
            }

            // Recarrega reservas do laboratório se houver
            if (selectedReserva.laboratorio?.id) {
                fetchReservasPorLab(selectedReserva.laboratorio.id);
            }

            // limpa seleção de detalhe (mas preserva dataSelecionada caso queira confirmar outra ocorrência)
            setSelectedReserva(null);
            setOpenDialogDetalhes(false);
        } catch (err) {
            console.error("Erro ao confirmar reserva fixa", err);
            setErrorMessage("Erro ao confirmar reserva fixa");
        } finally {
            setLoading(false);
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
    // Ajuste pedido: determinar status exibido no diálogo
    // -----------------------
    const getDisplayStatus = (): string => {
        if (!selectedReserva) return "-";
        // se já tem status definido, retorna direto
        if (selectedReserva.status) return selectedReserva.status;
        // para FIXA, tentamos encontrar a ocorrência específica na lista `reservas`
        if (selectedReserva.tipo === "FIXA") {
            const occurrenceDate = dataSelecionada ||
                (selectedReserva.dataInicio ? new Date(selectedReserva.dataInicio).toISOString().split("T")[0] : "");

            if (occurrenceDate) {
                // procura ocorrência com mesmo id (id informativo da fixa) e dataInicio começando com a data
                const match = reservas.find(r =>
                    r.id === selectedReserva.id &&
                    r.dataInicio &&
                    r.dataInicio.startsWith(occurrenceDate)
                );
                if (match && match.status) return match.status;
            }
        }
        return "-";
    };

    // -----------------------
    // Render event content (ajustado para mostrar disciplina)
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
                {!isMobile && (
                    <span className="text-[11px] font-semibold leading-tight">
                        {startHour}{endHour ? ` - ${endHour}` : ""}
                    </span>
                )}

                <span className={`text-[12px] font-semibold truncate ${isMobile ? 'text-sm' : ''}`}>
                    {reserva?.usuario?.nome ?? event.title}
                </span>

                {/* linha ajustada — mostra laboratório e disciplina (se existir) */}
                <span className={`text-[11px] truncate ${isMobile ? 'text-xs opacity-95' : ''}`}>
                    {reserva?.laboratorio?.nome ?? ''}
                    {reserva?.disciplina?.nome && (
                        <> — <span className="italic">{reserva.disciplina.nome}</span></>
                    )}
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
                                        {selectedReserva.disciplina && (
                                            <div><strong>Disciplina:</strong> {selectedReserva.disciplina.nome}{selectedReserva.disciplina.descricao ? ` — ${selectedReserva.disciplina.descricao}` : ""}</div>
                                        )}
                                        <div><strong>Status:</strong> {getDisplayStatus()}</div>
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

                            {/* Botão roxo-claro para confirmar utilização (visível para ADMIN ou PROF_COMP, só para FIXA e se não estiver confirmada) */}
                            {(roles.includes("ADMIN") || roles.includes("PROF_COMP")) &&
                                selectedReserva?.tipo === "FIXA" &&
                                getDisplayStatus() !== "CONFIRMADA" && (
                                    <Button
                                        onClick={handleConfirmarReservaFixa}
                                        disabled={loading}
                                        className="bg-violet-300 hover:bg-violet-400 text-white"
                                    >
                                        {loading ? "Processando..." : "Confirmar utilização"}
                                    </Button>
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

                                    {/* Disciplina (opcional) — usa disciplinas do usuário quando disponíveis */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1">Disciplina (opcional)</label>
                                        <select
                                            className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={selectedDisciplina}
                                            onChange={(e) => setSelectedDisciplina(e.target.value === "" ? "" : Number(e.target.value))}
                                            disabled={!selectedUser || disciplinasAtuais.length === 0}
                                        >
                                            <option value="">Nenhuma disciplina</option>

                                            {disciplinasAtuais.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.nome}{d.descricao ? ` — ${d.descricao}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Opcional — associar a reserva a uma disciplina (se aplicável).</p>
                                    </div>

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
