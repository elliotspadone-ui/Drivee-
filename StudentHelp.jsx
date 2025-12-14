import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle, ChevronDown, Search, Book, Calendar, CreditCard, 
  MessageSquare, Phone, Mail, FileText, Video, ExternalLink 
} from "lucide-react";

export default function StudentHelp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);

  const categories = [
    { name: "Getting Started", icon: Book, color: "from-[#3b82c4] to-[#2563a3]" },
    { name: "Booking Lessons", icon: Calendar, color: "from-[#81da5a] to-[#5cb83a]" },
    { name: "Payments", icon: CreditCard, color: "from-[#e7d356] to-[#d4bf2e]" },
    { name: "Progress Tracking", icon: FileText, color: "from-[#6c376f] to-[#5a2d5d]" }
  ];

  const faqs = [
    {
      category: "Getting Started",
      question: "How do I book my first lesson?",
      answer: "Go to 'Book Lesson' from the menu, select your preferred instructor, choose a date and time, and complete the booking. You'll receive a confirmation email and SMS reminder."
    },
    {
      category: "Booking Lessons",
      question: "Can I cancel or reschedule a lesson?",
      answer: "Yes! You can cancel or reschedule up to 24 hours before your lesson without any fees. Go to 'My Lessons' and click on the lesson you want to modify."
    },
    {
      category: "Payments",
      question: "What payment methods are accepted?",
      answer: "We accept credit/debit cards, bank transfers, Apple Pay, and Google Pay. All payments are secure and processed instantly."
    },
    {
      category: "Progress Tracking",
      question: "How do I track my learning progress?",
      answer: "Visit the 'My Progress' page to see your completed hours, skills mastered, and upcoming milestones. Your instructor also adds notes after each lesson."
    },
    {
      category: "Getting Started",
      question: "How do I access theory test materials?",
      answer: "Navigate to the 'Theory' section where you'll find practice questions, mock tests, and study materials. Track your progress and prepare for the official test."
    },
    {
      category: "Payments",
      question: "Can I purchase lesson packages?",
      answer: "Yes! Visit the 'Packages' section to see available bundles. Packages often include discounts and can help you save money on multiple lessons."
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">How can we help?</h1>
        <p className="text-lg text-slate-600">Find answers to common questions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20 focus:border-[#3b82c4]"
        />
      </div>

      {/* Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, idx) => (
          <motion.button
            key={cat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition text-center"
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
              <cat.icon className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-slate-900">{cat.name}</p>
          </motion.button>
        ))}
      </div>

      {/* FAQs */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <h3 className="font-bold text-slate-900 pr-4">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-6 pb-5 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-gradient-to-br from-[#e8f4fa] to-white rounded-2xl p-8 border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-900 mb-4">Still need help?</h3>
        <p className="text-slate-600 mb-6">Our support team is here for you</p>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="mailto:support@drivee.eu"
            className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-[#e8f4fa] rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#3b82c4]" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Email Support</p>
              <p className="text-sm text-slate-600">support@drivee.eu</p>
            </div>
          </a>
          <button className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition">
            <div className="w-10 h-10 bg-[#eefbe7] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#5cb83a]" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Live Chat</p>
              <p className="text-sm text-slate-600">Chat with us now</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}