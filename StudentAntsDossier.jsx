import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

import AntsStatusBadge from "@/components/ants/AntsStatusBadge";
import AntsDisclaimer from "@/components/ants/AntsDisclaimer";
import StudentAntsWizard from "@/components/ants/StudentAntsWizard";
import { shouldShowAnts } from "@/components/utils/localisation";

const EDITABLE_STATUSES = ["draft", "waiting_student_input", "needs_correction"];

export default function StudentAntsDossier() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  // Load current authenticated user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        // If not authenticated, send to login or student dashboard
        console.log("Not authenticated", err);
        navigate(createPageUrl("Login"));
      } finally {
        setUserLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const {
    data: student,
    isLoading: loadingStudent,
    isError: studentError,
    error: studentErrorObj
  } = useQuery({
    queryKey: ["student", user?.email],
    queryFn: async () => {
      const students = await base44.entities.Student.filter({ email: user.email });
      return students[0] || null;
    },
    enabled: !!user?.email,
    retry: 1
  });

  const {
    data: school,
    isLoading: loadingSchool,
    isError: schoolError,
    error: schoolErrorObj
  } = useQuery({
    queryKey: ["school", student?.school_id],
    queryFn: async () => {
      const schools = await base44.entities.School.list();
      if (!schools || schools.length === 0) return null;

      if (student?.school_id) {
        const matched = schools.find((s) => s.id === student.school_id);
        return matched || schools[0];
      }

      return schools[0];
    },
    enabled: !!student,
    retry: 1
  });

  const {
    data: dossier,
    isLoading: loadingDossier,
    isError: dossierError,
    error: dossierErrorObj,
    refetch
  } = useQuery({
    queryKey: ["antsDossier", student?.id],
    queryFn: async () => {
      const dossiers = await base44.entities.AntsDossier.filter({
        student_id: student.id
      });
      return dossiers[0] || null;
    },
    enabled: !!student?.id,
    retry: 1
  });

  const isLoading = userLoading || loadingStudent || loadingSchool || loadingDossier;
  const isError = studentError || schoolError || dossierError;
  const activeError = studentErrorObj || schoolErrorObj || dossierErrorObj;

  // Check if school operates in France using the operating_country field
  const isFrenchSchool = shouldShowAnts(school?.operating_country);

  // Redirect non French schools to student dashboard, but only once context is ready
  useEffect(() => {
    if (!isLoading && school && school.operating_country && !isFrenchSchool) {
      navigate(createPageUrl("StudentDashboard"));
    }
  }, [isLoading, school, isFrenchSchool, navigate]);

  const canEdit = !dossier || EDITABLE_STATUSES.includes(dossier.status);

  const formattedUpdateDate = useMemo(() => {
    if (!dossier) return null;
    const dateValue = dossier.updated_date || dossier.created_date;
    if (!dateValue) return null;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString("fr-FR");
  }, [dossier]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-zinc-600">Chargement de votre dossier ANTS...</p>
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
                Impossible de charger votre dossier ANTS
              </h2>
              <p className="text-sm text-zinc-700 mb-4">
                {activeError?.message ||
                  "Une erreur inattendue est survenue lors du chargement de vos informations."}
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
                  onClick={() => navigate(createPageUrl("StudentDashboard"))}
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

  // If we are sure it is not a French school, we either redirected already or show message for non French context
  if (!isFrenchSchool) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            Fonctionnalité non disponible
          </h2>
          <p className="text-zinc-600 mb-4 text-sm">
            Le dossier ANTS est uniquement disponible pour les auto écoles basées en France.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("StudentDashboard"))}
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  // Wizard view for creation or correction
  if (showWizard || (canEdit && !dossier)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowWizard(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          {dossier && (
            <AntsStatusBadge status={dossier.status} />
          )}
        </div>
        <StudentAntsWizard
          dossier={dossier}
          student={student}
          school={school}
          onComplete={() => {
            setShowWizard(false);
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("StudentDashboard")}>
              <Button variant="ghost" size="icon" aria-label="Retour au tableau de bord">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Mon dossier ANTS</h1>
              <p className="text-sm text-zinc-500">
                Demande de numéro NEPH pour le permis de conduire
              </p>
              {student?.full_name && (
                <p className="text-xs text-zinc-400 mt-1">
                  Dossier associé à {student.full_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dossier && <AntsStatusBadge status={dossier.status} />}
            {dossier && (
              <Button
                variant="outline"
                size="icon"
                className="ml-1"
                aria-label="Rafraîchir le statut du dossier"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <AntsDisclaimer />

        {/* Dossier Status and Actions */}
        {dossier ? (
          <div className="mt-6 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">État du dossier</h2>

              <div className="space-y-4">
                {/* Status Timeline */}
                <div className="flex flex-wrap items-center gap-3">
                  <AntsStatusBadge status={dossier.status} />
                  {formattedUpdateDate && (
                    <span className="text-sm text-zinc-500">
                      Mis à jour le {formattedUpdateDate}
                    </span>
                  )}
                </div>

                {/* Admin Message */}
                {dossier.status === "needs_correction" && dossier.admin_message && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">Corrections demandées</p>
                        <p className="text-sm text-amber-700 mt-1">{dossier.admin_message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ANTS Reference */}
                {dossier.ants_reference && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-900">Numéro NEPH</p>
                        <p className="text-lg font-mono text-emerald-700 mt-1">
                          {dossier.ants_reference}
                        </p>
                        <p className="text-xs text-emerald-700 mt-1">
                          Conservez ce numéro, il vous sera demandé lors de vos démarches avec
                          l auto école et le centre d examen.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Awaiting ANTS Activation */}
                {dossier.status === "awaiting_student_ants_activation" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">
                          Activation de votre compte ANTS
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Vous avez reçu un email de l ANTS. Connectez vous sur le site officiel
                          pour activer votre compte et confirmer la demande.
                        </p>
                        <a
                          href="https://permisdeconduire.ants.gouv.fr/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Accéder au site ANTS
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {canEdit && (
                  <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-3">
                    <Button onClick={() => setShowWizard(true)}>
                      {dossier.status === "needs_correction" ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Corriger mon dossier
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Compléter mon dossier
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-zinc-500 mt-2">
                      Vous pourrez vérifier vos informations avant validation finale par votre
                      auto école.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Dossier Details (Read only) */}
            {!canEdit && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-900 mb-4">
                  Informations du dossier
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-2">Identité</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-zinc-500">Nom :</span>{" "}
                        {dossier.student_last_name}
                      </p>
                      <p>
                        <span className="text-zinc-500">Prénom :</span>{" "}
                        {dossier.student_first_name}
                      </p>
                      <p>
                        <span className="text-zinc-500">Naissance :</span>{" "}
                        {dossier.birth_date}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-2">Formation</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-zinc-500">Catégorie :</span>{" "}
                        {dossier.licence_category}
                      </p>
                      <p>
                        <span className="text-zinc-500">Type :</span>{" "}
                        {dossier.training_type}
                      </p>
                      <p>
                        <span className="text-zinc-500">Auto école :</span>{" "}
                        {dossier.auto_ecole_name}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-zinc-500 mb-2">
                      Documents fournis
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dossier.id_document_url && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Pièce d identité
                        </span>
                      )}
                      {dossier.proof_of_address_url && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Justificatif de domicile
                        </span>
                      )}
                      {(dossier.e_photo_code || dossier.id_photo_url) && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo d identité
                        </span>
                      )}
                      {dossier.assr_document_url && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          ASSR2/ASR
                        </span>
                      )}
                      {!dossier.id_document_url &&
                        !dossier.proof_of_address_url &&
                        !dossier.e_photo_code &&
                        !dossier.id_photo_url &&
                        !dossier.assr_document_url && (
                          <span className="text-sm text-zinc-500">
                            Aucun document n apparaît pour l instant. Contactez votre auto
                            école si vous pensez que c est une erreur.
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No Dossier Yet */
          <div className="mt-6 bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">
              Créez votre dossier ANTS
            </h2>
            <p className="text-zinc-600 mb-2 max-w-md mx-auto text-sm">
              Pour passer votre examen du permis de conduire, vous devez d abord obtenir
              un numéro NEPH via le portail ANTS.
            </p>
            <p className="text-xs text-zinc-500 mb-6 max-w-md mx-auto">
              Le questionnaire est guidé et dure quelques minutes. Vous pourrez reprendre
              plus tard si vous ne pouvez pas le terminer en une fois.
            </p>
            <Button size="lg" onClick={() => setShowWizard(true)}>
              <Send className="w-5 h-5 mr-2" />
              Commencer mon dossier ANTS
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
