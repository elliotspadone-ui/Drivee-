import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  ExternalLink,
  FileText,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Shield,
  HelpCircle,
  Phone,
  Mail,
  Building2,
  Globe,
  Users
} from "lucide-react";
import VeeMascot from "@/components/common/VeeMascot";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/8bd9d7a47_ChatGPTImageNov29202511_47_17PM.png";

const easing = [0.22, 1, 0.36, 1];

const BOOKING_STEPS = [
  {
    step: 1,
    title: "Create your ANTS account",
    description: "Register on the official French government portal to manage your driving license application.",
    icon: Users,
    duration: "5-10 min",
    tips: [
      "You'll need a valid email address",
      "Have your ID document ready",
      "Keep your login credentials safe"
    ],
    link: "https://permisdeconduire.ants.gouv.fr",
    linkText: "Go to ANTS Portal"
  },
  {
    step: 2,
    title: "Get your NEPH number",
    description: "After registration, you'll receive your NEPH (Numéro d'Enregistrement Préfectoral Harmonisé) - this is required to book your exam.",
    icon: FileText,
    duration: "24-48 hours",
    tips: [
      "Check your email for confirmation",
      "The NEPH is a 12-digit number",
      "Save it somewhere secure"
    ]
  },
  {
    step: 3,
    title: "Book your exam slot",
    description: "Once you have your NEPH, you can book a theory test slot at an approved exam center near you.",
    icon: Calendar,
    duration: "5 min",
    tips: [
      "Choose a center close to you",
      "Book at least 2 weeks in advance",
      "Morning slots often have better availability"
    ],
    link: "https://www.lfranceconnect.gouv.fr",
    linkText: "Find Exam Centers"
  },
  {
    step: 4,
    title: "Pay the exam fee",
    description: "The theory test costs €30. Payment is made online when booking your slot.",
    icon: CreditCard,
    duration: "2 min",
    tips: [
      "Payment by card only",
      "Keep your receipt",
      "Fee is non-refundable if you miss your exam"
    ]
  },
  {
    step: 5,
    title: "Prepare & attend",
    description: "Arrive 15 minutes early with your ID and booking confirmation. The test takes 30 minutes with 40 questions.",
    icon: CheckCircle,
    duration: "30 min exam",
    tips: [
      "Bring valid photo ID",
      "No phones allowed in the exam room",
      "You need 35/40 to pass"
    ]
  }
];

const FAQ_ITEMS = [
  {
    question: "How much does the theory test cost?",
    answer: "The theory test costs €30, paid online when you book your slot. This fee is set by the government and is the same at all approved exam centers."
  },
  {
    question: "What documents do I need to bring?",
    answer: "You need to bring a valid photo ID (passport, national ID card, or residence permit) and your booking confirmation. Make sure the name on your ID matches your registration."
  },
  {
    question: "Can I reschedule my exam?",
    answer: "Yes, you can reschedule up to 48 hours before your exam at no extra cost. After that, you'll need to book a new slot and pay again."
  },
  {
    question: "How soon can I retake if I fail?",
    answer: "You can book a new exam immediately if you fail. There's no waiting period, but you'll need to pay the €30 fee again."
  },
  {
    question: "What score do I need to pass?",
    answer: "You need to answer at least 35 out of 40 questions correctly (87.5%) to pass the theory test."
  }
];

export default function TheoryExamBooking() {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState(1);
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7fc] to-white">
      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }
        
        .shadow-premium {
          box-shadow: 
            0 0 0 1px rgba(0, 0, 0, 0.02),
            0 1px 2px rgba(0, 0, 0, 0.03),
            0 4px 8px rgba(0, 0, 0, 0.04),
            0 12px 24px rgba(0, 0, 0, 0.05);
        }
        
        .shadow-premium-lg {
          box-shadow: 
            0 0 0 1px rgba(0, 0, 0, 0.02),
            0 2px 4px rgba(0, 0, 0, 0.02),
            0 8px 16px rgba(0, 0, 0, 0.04),
            0 24px 48px rgba(0, 0, 0, 0.06);
        }
      `}</style>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(createPageUrl("TheoryLearning"))}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Theory
            </button>
            <Link to={createPageUrl("Landing")}>
              <img src={LOGO_URL} alt="DRIVEE" className="h-10 object-contain" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f4fa] border border-[#d4eaf5] text-sm font-semibold text-[#3b82c4] mb-6">
            <Calendar className="w-4 h-4" />
            Official Exam Booking Guide
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
            Book your <span className="text-[#3b82c4]">theory exam</span>
          </h1>
          
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Follow these simple steps to book your official theory test. 
            We'll guide you through the entire process.
          </p>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-premium">
              <p className="text-2xl font-bold text-[#3b82c4]">€30</p>
              <p className="text-xs text-slate-500">Exam fee</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-premium">
              <p className="text-2xl font-bold text-[#5cb83a]">30 min</p>
              <p className="text-xs text-slate-500">Test duration</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-premium">
              <p className="text-2xl font-bold text-[#6c376f]">35/40</p>
              <p className="text-xs text-slate-500">To pass</p>
            </div>
          </div>
        </motion.div>

        {/* Steps Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: easing }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#3b82c4]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Step-by-step guide</h2>
          </div>

          <div className="space-y-4">
            {BOOKING_STEPS.map((step, idx) => {
              const isExpanded = expandedStep === step.step;
              const StepIcon = step.icon;
              
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-white rounded-2xl border-2 overflow-hidden shadow-premium transition-all ${
                    isExpanded ? "border-[#3b82c4]" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                    className="w-full p-5 text-left flex items-center gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isExpanded 
                        ? "bg-gradient-to-br from-[#3b82c4] to-[#2563a3]" 
                        : "bg-slate-100"
                    }`}>
                      <span className={`text-lg font-bold ${isExpanded ? "text-white" : "text-slate-600"}`}>
                        {step.step}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-slate-500 truncate">{step.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                        <Clock className="w-3 h-3" />
                        {step.duration}
                      </span>
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0">
                          <div className="pl-16">
                            <p className="text-slate-600 mb-4">{step.description}</p>
                            
                            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tips</p>
                              <ul className="space-y-2">
                                {step.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                    <CheckCircle className="w-4 h-4 text-[#5cb83a] mt-0.5 flex-shrink-0" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {step.link && (
                              <a
                                href={step.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3b82c4] hover:bg-[#2563a3] text-white text-sm font-semibold rounded-xl transition-colors"
                              >
                                <Globe className="w-4 h-4" />
                                {step.linkText}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Vee Tip Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: easing }}
          className="bg-gradient-to-r from-[#e8f4fa] via-white to-[#eefbe7] rounded-2xl border border-[#d4eaf5] p-6 mb-12 shadow-premium"
        >
          <div className="flex items-start gap-4">
            <VeeMascot size="md" mood="happy" animate />
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e7a83e]" />
                Vee's Pro Tip
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Make sure you've completed all our practice tests and mock exams before booking your real exam. 
                Students who score consistently above 90% on our mock exams have a <strong className="text-[#5cb83a]">98% pass rate</strong> on the official test!
              </p>
              <button
                onClick={() => navigate(createPageUrl("TheoryLearning"))}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Continue Practicing
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: easing }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#f3e8f4] rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-[#6c376f]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Frequently asked questions</h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-premium"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-semibold text-slate-900">{faq.question}</span>
                    <ChevronRight className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: easing }}
          className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-premium-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2">Need help with your booking?</h3>
              <p className="text-slate-400 text-sm">
                Our support team is here to guide you through the process.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@drivee.com"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition"
              >
                <Mail className="w-4 h-4" />
                Email Support
              </a>
              <a
                href="tel:+33123456789"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#3b82c4] hover:bg-[#2563a3] rounded-xl text-sm font-semibold transition"
              >
                <Phone className="w-4 h-4" />
                Call Us
              </a>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}