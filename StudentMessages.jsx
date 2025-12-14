import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquare, Send, Loader2, User, Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function StudentMessages() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  
  const [student, setStudent] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const loadStudent = async () => {
      const devUser = sessionStorage.getItem("dev_auth_user");
      const user = devUser ? JSON.parse(devUser) : await base44.auth.me();
      const students = await base44.entities.Student.filter({ email: user.email });
      if (students.length > 0) setStudent(students[0]);
    };
    loadStudent();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['studentMessages', student?.id],
    queryFn: async () => {
      if (!student) return [];
      return await base44.entities.Message.filter(
        { $or: [{ sender_id: student.id }, { recipient_id: student.id }] },
        '-created_date'
      );
    },
    enabled: !!student,
    refetchInterval: 5000
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list()
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentMessages'] });
      setMessageText("");
      toast.success("Message sent");
    }
  });

  const instructorConversations = React.useMemo(() => {
    const byInstructor = {};
    messages.forEach(msg => {
      const instructorId = msg.sender_id === student?.id ? msg.recipient_id : msg.sender_id;
      if (!byInstructor[instructorId]) byInstructor[instructorId] = [];
      byInstructor[instructorId].push(msg);
    });
    
    return Object.entries(byInstructor).map(([instructorId, msgs]) => {
      const instructor = instructors.find(i => i.id === instructorId);
      const lastMsg = msgs[0];
      const unread = msgs.filter(m => m.recipient_id === student?.id && !m.is_read).length;
      return { instructorId, instructor, messages: msgs, lastMessage: lastMsg, unreadCount: unread };
    }).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
  }, [messages, instructors, student]);

  const currentMessages = selectedInstructor?.messages || [];

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedInstructor) return;
    
    sendMessageMutation.mutate({
      sender_id: student.id,
      sender_name: student.full_name,
      sender_type: "student",
      recipient_id: selectedInstructor.instructorId,
      content: messageText,
      conversation_id: `${student.id}_${selectedInstructor.instructorId}`
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-12rem)]">
        <div className="grid md:grid-cols-3 h-full">
          <div className="border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#3b82c4]" />
                Instructors
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {instructorConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No messages yet</p>
                </div>
              ) : (
                instructorConversations.map((conv) => (
                  <button
                    key={conv.instructorId}
                    onClick={() => setSelectedInstructor(conv)}
                    className={`w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition text-left ${
                      selectedInstructor?.instructorId === conv.instructorId ? "bg-[#e8f4fa]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conv.instructor?.full_name?.charAt(0) || "I"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-slate-900 truncate">{conv.instructor?.full_name || "Instructor"}</p>
                          {conv.unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-[#3b82c4] text-white text-xs font-bold rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate">{conv.lastMessage.content}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(conv.lastMessage.created_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col">
            {!selectedInstructor ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Select an instructor to start messaging</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-full flex items-center justify-center text-white font-bold">
                      {selectedInstructor.instructor?.full_name?.charAt(0) || "I"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{selectedInstructor.instructor?.full_name}</p>
                      <p className="text-sm text-slate-500">{selectedInstructor.instructor?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentMessages.slice().reverse().map((msg) => {
                    const isMine = msg.sender_id === student?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          isMine ? "bg-[#3b82c4] text-white" : "bg-slate-100 text-slate-900"
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className={`text-xs mt-2 ${isMine ? "text-white/70" : "text-slate-500"}`}>
                            {format(new Date(msg.created_date), "h:mm a")}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}