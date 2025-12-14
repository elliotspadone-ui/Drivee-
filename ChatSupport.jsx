import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function ChatSupport() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load current user once
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load current user", error);
      } finally {
        setUserLoading(false);
      }
    };
    loadUser();
  }, []);

  // Messages for selected conversation
  const {
    data: messages = [],
    isLoading: loadingMessages,
    isError: messagesError,
  } = useQuery({
    queryKey: ["chatMessages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      return base44.entities.ChatMessage.filter(
        { conversation_id: selectedConversation },
        "created_date"
      );
    },
    enabled: !!selectedConversation,
    refetchInterval: 3000,
  });

  // All messages to build conversation list and unread counts
  const {
    data: allMessages = [],
    isLoading: loadingAllMessages,
    isError: allMessagesError,
  } = useQuery({
    queryKey: ["allChatMessages"],
    queryFn: () => base44.entities.ChatMessage.list("-created_date"),
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload) => base44.entities.ChatMessage.create(payload),
    onSuccess: (createdMessage, variables) => {
      // Refresh this conversation and the global list
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", variables.conversation_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["allChatMessages"],
      });
      setMessageText("");
    },
    onError: () => {
      // In a real app you might use toast here
      console.error("Failed to send message");
    },
  });

  const isSending = sendMessageMutation.isLoading;
  const isMessagesPanelLoading =
    loadingMessages || loadingAllMessages || userLoading;

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation || !user || isSending) {
      return;
    }

    const senderType =
      user.role === "admin"
        ? "admin"
        : user.role === "instructor"
        ? "instructor"
        : "student";

    sendMessageMutation.mutate({
      conversation_id: selectedConversation,
      sender_id: user.id,
      sender_type: senderType,
      recipient_id: "school_admin",
      recipient_type: "admin",
      message: messageText.trim(),
      school_id: user.school_id || "default",
    });
  };

  // Support Enter to send, Shift+Enter for new line
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto scroll to newest message
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConversation]);

  // Build conversation list from all messages
  const conversationIds = Array.from(
    new Set(allMessages.map((m) => m.conversation_id))
  );

  const filteredConversations = conversationIds.filter((convId) =>
    convId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasError = messagesError || allMessagesError;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-12rem)]">
      <div className="neo-surface p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
            <p className="text-gray-600">
              Chat with students and instructors in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="neo-surface p-0 h-[calc(100%-8rem)] flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingAllMessages ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Loading conversations...
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((convId) => {
                const convMessages = allMessages.filter(
                  (m) => m.conversation_id === convId
                );
                const lastMessage = convMessages[0];
                const unreadCount = user
                  ? convMessages.filter(
                      (m) => !m.is_read && m.recipient_id === user.id
                    ).length
                  : 0;

                return (
                  <button
                    key={convId}
                    onClick={() => setSelectedConversation(convId)}
                    className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-all ${
                      selectedConversation === convId ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {convId}
                      </p>
                      {unreadCount > 0 && (
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {lastMessage?.message || "No messages yet"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {lastMessage
                        ? new Date(
                            lastMessage.created_date
                          ).toLocaleTimeString()
                        : ""}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No conversations found</p>
                <p className="text-xs text-gray-400 mt-1">
                  New conversations will appear here when messages are sent.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 truncate">
                    {selectedConversation}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Replies are visible to the linked student and instructor.
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60">
                {hasError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2 inline-block">
                    There was a problem loading messages. Try reloading the
                    page.
                  </div>
                )}

                {isMessagesPanelLoading && !messages.length ? (
                  <p className="text-sm text-gray-400 text-center mt-6">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-6">
                    <p>No messages yet in this conversation.</p>
                    <p className="text-xs mt-1">
                      Start by sending the first message below.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = user && msg.sender_id === user.id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-md rounded-2xl px-4 py-3 ${
                            isMine
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-gray-900 border border-gray-100"
                          }`}
                        >
                          <p className="text-xs mb-1 opacity-75">
                            {msg.sender_type || ""}
                          </p>
                          <p className="text-sm whitespace-pre-line">
                            {msg.message}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? "text-indigo-200" : "text-gray-500"
                            }`}
                          >
                            {new Date(msg.created_date).toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={
                        userLoading
                          ? "Loading your profile..."
                          : "Type a message..."
                      }
                      disabled={!user || isSending}
                      className="flex-1"
                    />
                    {!user && !userLoading && (
                      <p className="text-xs text-amber-600 mt-1">
                        You need to be logged in to send messages.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    className="neo-button px-6"
                    disabled={
                      !messageText.trim() ||
                      !selectedConversation ||
                      !user ||
                      isSending
                    }
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                {userLoading ? (
                  <p>Loading your profile...</p>
                ) : (
                  <>
                    <p>Select a conversation to view messages</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use the panel on the left to browse ongoing chats.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
