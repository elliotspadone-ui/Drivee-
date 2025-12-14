import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  MapPin,
  FileText,
  Heart,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Edit3,
  Save,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import AntsStatusBadge, { STATUS_CONFIG } from "@/components/ants/AntsStatusBadge";
import AntsDisclaimer from "@/components/ants/AntsDisclaimer";

const STATUS_TRANSITIONS = {
  draft: ["waiting_student_input"],
  waiting_student_input: ["ready_for_review", "needs_correction"],
  ready_for_review: ["under_review", "ready_to_send_ants", "needs_correction"],
  under_review: ["ready_to_send_ants", "needs_correction"],
  ready_to_send_ants: ["sent_to_ants", "needs_correction"],
  sent_to_ants: ["awaiting_student_ants_activation", "accepted_by_ants", "rejected_by_ants"],
  awaiting_student_ants_activation: ["accepted_by_ants", "rejected_by_ants"],
  accepted_by_ants: [],
  rejected_by_ants: ["needs_correction"],
  needs_correction: ["ready_for_review"]
};

function formatDateSafe(value, pattern = "dd MMMM yyyy") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  try {
    return format(d, pattern, { locale: fr });
  } catch {
    return "-";
  }
}

function formatGender(value) {
  if (value === "M") return "Homme";
  if (value === "F") return "Femme";
  return value || "Non renseigné";
}

export default function AdminAntsDossierDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [antsReference, setAntsReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const dossierId = urlParams.get("id");

  // Load admin user
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
    data: dossier,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["antsDossier", dossierId],
    queryFn: async () => {
      const dossiers = await base44.entities.AntsDossier.filter({ id: dossierId });
      return dossiers[0] || null;
    },
    enabled: !!dossierId && !!user,
    retry: 1
  });

  const { data: student } = useQuery({
    queryKey: ["student", dossier?.student_id],
    queryFn: async () => {
      const students = await base44.entities.Student.filter({ id: dossier.student_id });
      return students[0] || null;
    },
    enabled: !!dossier?.student_id,
    retry: 1
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.AntsDossier.update(dossierId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["antsDossier", dossierId] });
      toast.success("Dossier mis à jour");
      setIsEditing(false);
      refetch();
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!dossier) throw new Error("Dossier introuvable");
      if (!user?.email) throw new Error("Utilisateur introuvable");

      const updateData = {
        status: newStatus,
        status_history: [
          ...(dossier.status_history || []),
          {
            status: newStatus,
            changed_by: user.email,
            changed_at: new Date().toISOString(),
            message: statusMessage || `Statut changé vers ${STATUS_CONFIG[newStatus]?.label || newStatus}`
          }
        ]
      };

      if (newStatus === "sent_to_ants") {
        updateData.sent_at = new Date().toISOString();
      }
      if (newStatus === "accepted_by_ants") {
        updateData.accepted_at = new Date().toISOString();
        if (antsReference) {
          updateData.ants_reference = antsReference;
        }
      }
      if (newStatus === "rejected_by_ants" && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      if (newStatus === "needs_correction" && statusMessage) {
        updateData.admin_message = statusMessage;
      } else if (newStatus !== "needs_correction" && dossier.admin_message) {
        // Clear previous correction message when leaving this status
        updateData.admin_message = null;
      }

      return base44.entities.AntsDossier.update(dossierId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["antsDossier", dossierId] });
      toast.success("Statut mis à jour");
      setShowStatusDialog(false);
      setNewStatus("");
      setStatusMessage("");
      setAntsReference("");
      setRejectionReason("");
      refetch();
    },
    onError: (err) => {
      toast.error(err?.message || "Erreur lors de la mise à jour");
    }
  });

  const handleStartEdit = () => {
    if (!dossier) return;
    setEditData({
      student_first_name: dossier.student_first_name || "",
      student_last_name: dossier.student_last_name || "",
      birth_name: dossier.birth_name || "",
      birth_date: dossier.birth_date || "",
      birth_place: dossier.birth_place || "",
      gender: dossier.gender || "",
      email: dossier.email || "",
      mobile: dossier.mobile || "",
      nationality: dossier.nationality || "",
      address_street: dossier.address_street || "",
      address_postcode: dossier.address_postcode || "",
      address_city: dossier.address_city || "",
      existing_neph: dossier.existing_neph || "",
      e_photo_code: dossier.e_photo_code || "",
      ants_reference: dossier.ants_reference || ""
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editData);
  };

  const handleStatusChange = (status) => {
    setNewStatus(status);
    setStatusMessage("");
    setAntsReference("");
    setRejectionReason("");
    setShowStatusDialog(true);
  };

  const availableTransitions = dossier ? STATUS_TRANSITIONS[dossier.status] || [] : [];

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-zinc-600">Chargement du dossier ANTS...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-700 mb-1">
                Impossible de charger le dossier
              </h2>
              <p className="text-sm text-zinc-700 mb-4">
                {error?.message || "Une erreur inattendue est survenue lors du chargement du dossier."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default" onClick={() => refetch()} className="text-sm">
                  Réessayer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("AdminAntsDossiers"))}
                  className="text-sm"
                >
                  Retour à la liste
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 text-center">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Dossier introuvable</h2>
          <p className="text-sm text-zinc-600 mb-4">
            Le dossier que vous cherchez n existe plus ou l identifiant est invalide.
          </p>
          <Button onClick={() => navigate(createPageUrl("AdminAntsDossiers"))}>
            Retour à la liste des dossiers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("AdminAntsDossiers"))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                Dossier de {dossier.student_first_name} {dossier.student_last_name}
              </h1>
              <p className="text-sm text-zinc-500">
                Créé le {formatDateSafe(dossier.created_date)}
                {student?.full_name && (
                  <span className="ml-1 text-zinc-400">
                    • Élève: {student.full_name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AntsStatusBadge status={dossier.status} />
            {!isEditing ? (
              <Button variant="outline" onClick={handleStartEdit}>
                <Edit3 className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identity */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Identité</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-500">Prénom</Label>
                  {isEditing ? (
                    <Input
                      value={editData.student_first_name}
                      onChange={(e) =>
                        setEditData({ ...editData, student_first_name: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.student_first_name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Nom</Label>
                  {isEditing ? (
                    <Input
                      value={editData.student_last_name}
                      onChange={(e) =>
                        setEditData({ ...editData, student_last_name: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.student_last_name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Nom de naissance</Label>
                  {isEditing ? (
                    <Input
                      value={editData.birth_name}
                      onChange={(e) =>
                        setEditData({ ...editData, birth_name: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.birth_name || "N/A"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Genre</Label>
                  <p className="font-medium">{formatGender(dossier.gender)}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Date de naissance</Label>
                  <p className="font-medium">
                    {formatDateSafe(dossier.birth_date, "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-zinc-500">Lieu de naissance</Label>
                  {isEditing ? (
                    <Input
                      value={editData.birth_place}
                      onChange={(e) =>
                        setEditData({ ...editData, birth_place: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.birth_place}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Email</Label>
                  {isEditing ? (
                    <Input
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{dossier.email}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Téléphone</Label>
                  {isEditing ? (
                    <Input
                      value={editData.mobile}
                      onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{dossier.mobile}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Adresse et nationalité</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-zinc-500">Adresse</Label>
                  {isEditing ? (
                    <Input
                      value={editData.address_street}
                      onChange={(e) =>
                        setEditData({ ...editData, address_street: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.address_street}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Code postal</Label>
                  {isEditing ? (
                    <Input
                      value={editData.address_postcode}
                      onChange={(e) =>
                        setEditData({ ...editData, address_postcode: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.address_postcode}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Ville</Label>
                  {isEditing ? (
                    <Input
                      value={editData.address_city}
                      onChange={(e) =>
                        setEditData({ ...editData, address_city: e.target.value })
                      }
                    />
                  ) : (
                    <p className="font-medium">{dossier.address_city}</p>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-500">Nationalité</Label>
                  <p className="font-medium">{dossier.nationality}</p>
                </div>
                {dossier.has_existing_french_file && (
                  <div>
                    <Label className="text-zinc-500">NEPH existant</Label>
                    {isEditing ? (
                      <Input
                        value={editData.existing_neph}
                        onChange={(e) =>
                          setEditData({ ...editData, existing_neph: e.target.value })
                        }
                      />
                    ) : (
                      <p className="font-medium font-mono">
                        {dossier.existing_neph || "N/A"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Documents</h2>
              </div>

              <div className="space-y-3">
                {[
                  { key: "id_document_url", label: "Pièce d identité" },
                  { key: "proof_of_address_url", label: "Justificatif de domicile" },
                  { key: "id_photo_url", label: "Photo d identité" },
                  { key: "assr_document_url", label: "ASSR2 / ASR" },
                  { key: "medical_certificate_url", label: "Certificat médical" },
                  { key: "cepc_document_url", label: "CEPC" }
                ].map((doc) => (
                  <div
                    key={doc.key}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {dossier[doc.key] ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-zinc-300" />
                      )}
                      <span className="text-sm font-medium">{doc.label}</span>
                    </div>
                    {dossier[doc.key] && (
                      <a
                        href={dossier[doc.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </a>
                    )}
                  </div>
                ))}

                {dossier.e_photo_code && (
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-medium">Code e-photo</span>
                    </div>
                    <p className="text-sm font-mono mt-1 ml-8">{dossier.e_photo_code}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Health & Legal */}
            {(dossier.has_medical_constraints || dossier.is_minor) && (
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-600" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Santé et représentant légal
                  </h2>
                </div>

                <div className="space-y-4">
                  {dossier.has_medical_constraints && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-amber-900">
                        Contrainte médicale déclarée
                      </p>
                      {dossier.medical_details && (
                        <p className="text-sm text-amber-700 mt-1">
                          {dossier.medical_details}
                        </p>
                      )}
                    </div>
                  )}

                  {dossier.is_minor && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        Représentant légal
                      </p>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>
                          {dossier.legal_representative_name} (
                          {dossier.legal_representative_relation})
                        </p>
                        {dossier.legal_representative_email && (
                          <p>{dossier.legal_representative_email}</p>
                        )}
                        {dossier.legal_representative_phone && (
                          <p>{dossier.legal_representative_phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* ANTS Reference */}
            {dossier.ants_reference && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-emerald-900">Numéro NEPH</h3>
                </div>
                <p className="text-2xl font-mono font-bold text-emerald-700">
                  {dossier.ants_reference}
                </p>
              </div>
            )}

            {/* Status Actions */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="font-bold text-zinc-900 mb-4">Actions</h3>

              <div className="space-y-2">
                {availableTransitions.map((status) => {
                  const Icon = STATUS_CONFIG[status]?.icon;
                  return (
                    <Button
                      key={status}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleStatusChange(status)}
                    >
                      {Icon && <Icon className="w-4 h-4 mr-2" />}
                      {STATUS_CONFIG[status]?.label || status}
                    </Button>
                  );
                })}

                {availableTransitions.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    Aucune action disponible pour ce statut
                  </p>
                )}
              </div>
            </div>

            {/* Training Info */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="font-bold text-zinc-900 mb-4">Formation</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Catégorie</span>
                  <span className="font-medium">{dossier.licence_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Type de formation</span>
                  <span className="font-medium">{dossier.training_type}</span>
                </div>
                {dossier.training_start_date && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Date de début</span>
                    <span className="font-medium">
                      {formatDateSafe(dossier.training_start_date, "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status History */}
            {dossier.status_history && dossier.status_history.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h3 className="font-bold text-zinc-900 mb-4">Historique</h3>
                <div className="space-y-3">
                  {dossier.status_history
                    .slice()
                    .reverse()
                    .slice(0, 5)
                    .map((entry, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-zinc-200 pl-3">
                        <p className="font-medium">
                          {STATUS_CONFIG[entry.status]?.label || entry.status}
                        </p>
                        {entry.changed_at && (
                          <p className="text-zinc-500 text-xs">
                            {formatDateSafe(entry.changed_at, "dd/MM/yyyy HH:mm")}
                          </p>
                        )}
                        {entry.message && (
                          <p className="text-zinc-600 text-xs mt-1">{entry.message}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <AntsDisclaimer variant="compact" />
          </div>
        </div>
      </motion.div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
            <DialogDescription>
              Vous allez changer le statut vers:{" "}
              {STATUS_CONFIG[newStatus]?.label || newStatus}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {newStatus === "accepted_by_ants" && (
              <div>
                <Label>Numéro NEPH attribué</Label>
                <Input
                  value={antsReference}
                  onChange={(e) => setAntsReference(e.target.value)}
                  placeholder="Ex: 123456789012"
                />
              </div>
            )}

            {newStatus === "rejected_by_ants" && (
              <div>
                <Label>Motif du refus</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Indiquez le motif du refus..."
                />
              </div>
            )}

            {newStatus === "needs_correction" && (
              <div>
                <Label>Message pour l élève</Label>
                <Textarea
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="Expliquez les corrections à apporter..."
                />
              </div>
            )}

            {!["accepted_by_ants", "rejected_by_ants", "needs_correction"].includes(
              newStatus
            ) && (
              <div>
                <Label>Note (optionnel)</Label>
                <Textarea
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="Ajouter une note..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
              disabled={updateStatusMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate()}
              disabled={!newStatus || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
