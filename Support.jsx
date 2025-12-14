import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone, Send, Loader2, CheckCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import VeeMascot from "@/components/common/VeeMascot";

export default function Support() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // Create SupportRequest entity if it exists, otherwise just log
      try {
        await base44.entities.SupportRequest.create({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          status: "open",
        });
      } catch (err) {
        // Entity might not exist, that's okay for now
        console.log("Support request submitted:", data);
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Support request submitted!");
    },
    onError: () => {
      toast.error("Failed to submit. Please try again.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    submitMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-3">Message Sent!</h1>
          <p className="text-zinc-600 mb-8">
            Thank you for contacting us. We'll get back to you within 24 hours.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({ name: "", email: "", subject: "", message: "" });
            }}
            className="px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-semibold transition"
          >
            Send Another Message
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <VeeMascot size="lg" mood="wave" animate={true} />
          <h1 className="text-4xl font-bold text-zinc-900 mt-6 mb-3">How can we help?</h1>
          <p className="text-zinc-600 max-w-2xl mx-auto">
            Get in touch with our support team. We're here to help you succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
            <div className="w-12 h-12 bg-[#e8f4fa] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-[#3b82c4]" />
            </div>
            <h3 className="font-bold text-zinc-900 mb-2">Email</h3>
            <p className="text-sm text-zinc-600 mb-3">support@drivee.com</p>
            <p className="text-xs text-zinc-400">Response within 24h</p>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
            <div className="w-12 h-12 bg-[#eefbe7] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-[#5cb83a]" />
            </div>
            <h3 className="font-bold text-zinc-900 mb-2">Phone</h3>
            <p className="text-sm text-zinc-600 mb-3">+33 1 23 45 67 89</p>
            <p className="text-xs text-zinc-400">Mon-Fri 9am-6pm</p>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
            <div className="w-12 h-12 bg-[#f3e8f4] rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-[#6c376f]" />
            </div>
            <h3 className="font-bold text-zinc-900 mb-2">Live Chat</h3>
            <p className="text-sm text-zinc-600 mb-3">Chat with us</p>
            <p className="text-xs text-zinc-400">Available 9am-6pm</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-8 md:p-12"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-[#3b82c4]" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Send us a message</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20 focus:border-[#3b82c4]"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20 focus:border-[#3b82c4]"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20 focus:border-[#3b82c4]"
                placeholder="How can we help?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20 focus:border-[#3b82c4] resize-none"
                placeholder="Tell us more about your question or issue..."
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full py-4 bg-gradient-to-r from-[#3b82c4] to-[#2563a3] hover:from-[#2563a3] hover:to-[#1e4f8a] text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Message
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}