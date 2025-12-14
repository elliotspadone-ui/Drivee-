import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  FileText,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  RefreshCw,
  MoreVertical,
  Mail,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import AntsStatusBadge, { STATUS_CONFIG } from "@/components/ants/AntsStatusBadge";
import AntsDisclaimer from "@/components/ants/AntsDisclaimer";
import { shouldShowAnts } from "@/components/utils/localisation";

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillon" },
  { value: "waiting_student_input", label: "En attente élève" },
  { value: "ready_for_review", label: "À vérifier" },
  { value: "ready_to_send_ants", label: "Prêt pour ANTS" },
  { value: "sent_to_ants", label: "Envoyé ANTS" },
  { value: "awaiting_student_ants_activation", label: "Activation requise" },
  { value: "accepted_by_ants", label: "Accepté" },
  { value: "rejected_by_ants", label: "Refusé" },
  { value: "needs_correction", label: "Corrections requises" }
];

export default function AdminAntsDossiers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        console.log("Not authenticated", err);
        navigate(createPageUrl("Login"));
      } finally {
        setUserLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const {
    data: school,
    isLoading: loadingSchool,
    isError: schoolError,
    error: schoolErrorObj
  } = useQuery({
    queryKey: ["adminSchool"],
    queryFn: async () => {
      const schools = await base44.entities.School.list();
      return schools[0] || null;
    },
    enabled: !!user,
    retry: 1
  });

  const {
    data: dossiers = [],
    isLoading: loadingDossiers,
    isError: dossiersError,
    error: dossiersErrorObj,
    refetch
  } = useQuery({
    queryKey: ["antsDossiers", school?.id],
    queryFn: async () => {
      return base44.entities.AntsDossier.filter({ school_id: school.id });
    },
    enabled: !!school?.id,
    retry: 1
  });

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: studentsError,
    error: studentsErrorObj
  } = useQuery({
    queryKey: ["students", school?.id],
    queryFn: async () => {
      return base44.entities.Student.filter({ school_id: school.id });
    },
    enabled: !!school?.id,
    retry: 1
  });

  const isLoading = userLoading || loadingSchool || loadingDossiers || loadingStudents;
  const isError = schoolError || dossiersError || studentsError;
  const activeError = schoolErrorObj || dossiersErrorObj || studentsErrorObj;

  const isFrenchSchool = shouldShowAnts(school?.operating_country);

  // Redirect non French schools once context is ready
  useEffect(() => {
    if (!isLoading && school && school.operating_country && !isFrenchSchool) {
      navigate(createPageUrl("Dashboard"));
    }
  }, [isLoading, school, isFrenchSchool, navigate]);

  // Enrich dossiers with student data
  const enrichedDossiers = useMemo(() => {
    return dossiers.map((dossier) => {
      const student = students.find((s) => s.id === dossier.student_id);
      return {
        ...dossier,
        studentData: student
      };
    });
  }, [dossiers, students]);

  // Filter dossiers
  const filteredDossiers = useMemo(() => {
    return enrichedDossiers.filter((dossier) => {
      if (statusFilter !== "all" && dossier.status !== statusFilter) return false;

      if (categoryFilter !== "all" && dossier.licence_category !== categoryFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${dossier.student_first_name} ${dossier.student_last_name}`.toLowerCase();
        const email = dossier.email?.toLowerCase() || "";
        const neph = dossier.ants_reference?.toLowerCase() || "";
        return fullName.includes(query) || email.includes(query) || neph.includes(query);
      }

      return true;
    });
  }, [enrichedDossiers, statusFilter, categoryFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: dossiers.length,
      pending: dossiers.filter((d) =>
        ["draft", "waiting_student_input", "needs_correction"].includes(d.status)
      ).length,
      toReview: dossiers.filter((d) => d.status === "ready_for_review").length,
      inProgress: dossiers.filter((d) =>
        ["sent_to_ants", "awaiting_student_ants_activation"].includes(d.status)
      ).length,
      completed: dossiers.filter((d) => d.status === "accepted_by_ants").length
    };
  }, [dossiers]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ dossierId, newStatus, message }) => {
      if (!user?.email) {
        throw new Error("Utilisateur introuvable");
      }

      const dossier = dossiers.find((d) => d.id === dossierId);
      if (!dossier) {
        throw new Error("Dossier introuvable");
      }

      const updateData = {
        status: newStatus,
        status_history: [
          ...(dossier.status_history || []),
          {
            status: newStatus,
            changed_by: user.email,
            changed_at: new Date().toISOString(),
            message: message || `Statut changé vers ${STATUS_CONFIG[newStatus]?.label || newStatus}`
          }
        ]
      };

      if (newStatus === "sent_to_ants") {
        updateData.sent_at = new Date().toISOString();
      }
      if (newStatus === "accepted_by_ants") {
        updateData.accepted_at = new Date().toISOString();
      }
      if (message) {
        updateData.admin_message = message;
      } else if (newStatus !== "needs_correction" && dossier.admin_message) {
        // Clear old correction message when moving away from correction status
        updateData.admin_message = null;
      }

      return base44.entities.AntsDossier.update(dossierId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["antsDossiers"] });
      toast.success("Statut mis à jour");
    },
    onError: (err) => {
      toast.error(err?.message || "Erreur lors de la mise à jour");
    }
  });

  const renderLastUpdated = (dossier) => {
    const sourceDate = dossier.updated_date || dossier.created_date;
    if (!sourceDate) return "-";
    const dateObj = new Date(sourceDate);
    if (Number.isNaN(dateObj.getTime())) return "-";
    return format(dateObj, "dd MMM yyyy", { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-zinc-600">Chargement des dossiers ANTS...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-700 mb-1">
                Impossible de charger les dossiers ANTS
              </h2>
              <p className="text-sm text-zinc-700 mb-4">
                {activeError?.message ||
                  "Une erreur inattendue est survenue lors du chargement des données."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  onClick={() => window.location.reload()}
                  className="text-sm"
                >
                  Réessayer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Dashboard"))}
                  className="text-sm"
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isFrenchSchool) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Fonctionnalité non disponible</h2>
          <p className="text-zinc-600 mb-4 text-sm">
            La gestion des dossiers ANTS est uniquement disponible pour les auto écoles basées en France.
          </p>
          <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Dossiers ANTS</h1>
            <p className="text-sm text-zinc-500">
              Gérez les demandes de numéro NEPH de vos élèves
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
                <p className="text-xs text-zinc-500">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.pending}</p>
                <p className="text-xs text-zinc-500">En attente</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.toReview}</p>
                <p className="text-xs text-zinc-500">À vérifier</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.inProgress}</p>
                <p className="text-xs text-zinc-500">En cours</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.completed}</p>
                <p className="text-xs text-zinc-500">Acceptés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Rechercher par nom, email ou NEPH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="B">Permis B</SelectItem>
                <SelectItem value="B_AAC">B - AAC</SelectItem>
                <SelectItem value="A1">Permis A1</SelectItem>
                <SelectItem value="A2">Permis A2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dossiers List */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          {filteredDossiers.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500">Aucun dossier trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredDossiers.map((dossier) => (
                <div
                  key={dossier.id}
                  className="p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        {dossier.student_first_name?.[0]}
                        {dossier.student_last_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900">
                            {dossier.student_first_name} {dossier.student_last_name}
                          </p>
                          <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                            {dossier.licence_category}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">{dossier.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <AntsStatusBadge status={dossier.status} size="small" />

                      <span className="text-xs text-zinc-400">
                        {renderLastUpdated(dossier)}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(createPageUrl(`AdminAntsDossierDetail?id=${dossier.id}`))
                            }
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir le détail
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {dossier.status === "ready_for_review" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  dossierId: dossier.id,
                                  newStatus: "ready_to_send_ants"
                                })
                              }
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Valider le dossier
                            </DropdownMenuItem>
                          )}
                          {dossier.status === "ready_to_send_ants" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  dossierId: dossier.id,
                                  newStatus: "sent_to_ants"
                                })
                              }
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Marquer envoyé ANTS
                            </DropdownMenuItem>
                          )}
                          {dossier.status === "sent_to_ants" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  dossierId: dossier.id,
                                  newStatus: "awaiting_student_ants_activation"
                                })
                              }
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Activation élève requise
                            </DropdownMenuItem>
                          )}
                          {["ready_for_review", "ready_to_send_ants"].includes(
                            dossier.status
                          ) && (
                            <DropdownMenuItem
                              onClick={() => {
                                const message = prompt("Message pour l'élève :");
                                if (message) {
                                  updateStatusMutation.mutate({
                                    dossierId: dossier.id,
                                    newStatus: "needs_correction",
                                    message
                                  });
                                }
                              }}
                              className="text-amber-600"
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Demander corrections
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(createPageUrl(`AdminAntsDossierDetail?id=${dossier.id}`))
                        }
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <AntsDisclaimer variant="compact" />
        </div>
      </motion.div>
    </div>
  );
}
