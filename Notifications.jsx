import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  Trash2,
  Mail,
  Filter,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import VeeMascot from "@/components/common/VeeMascot";

const getIcon = (type) => {
  switch (type) {
    case "booking": return Calendar;
    case "payment": return CreditCard;
    case "message": return MessageSquare;
    case "alert": return AlertCircle;
    default: return Bell;
  }
};

const getColor = (type) => {
  switch (type) {
    case "booking": return "bg-[#e8f4fa] text-[#3b82c4]";
    case "payment": return "bg-[#eefbe7] text-[#5cb83a]";
    case "message": return "bg-[#f3e8f4] text-[#6c376f]";
    case "alert": return "bg-[#fdfbe8] text-[#b8a525]";
    default: return "bg-slate-100 text-slate-600";
  }
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    loadUser();
  }, []);

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];
      
      const filters = { user_id: user.id };
      if (filter === "unread") filters.is_read = false;
      if (filter === "read") filters.is_read = true;
      
      return await base44.entities.Notification.filter(filters, '-created_date', 50);
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.update(notificationId, { 
        is_read: true,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Marked as read");
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => 
          base44.entities.Notification.update(n.id, { 
            is_read: true,
            read_at: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Notification deleted");
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (error) {
    return <QueryErrorBoundary error={error} onRetry={refetch} title="Failed to load notifications" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="px-4 py-2 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl text-sm font-semibold transition-all"
          >
            <CheckCircle className="w-4 h-4 inline-block mr-2" />
            Mark all read
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
        {[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread" },
          { value: "read", label: "Read" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === f.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <SkeletonLoader count={5} type="list" />
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <VeeMascot size="lg" mood="thinking" />
          <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">No notifications</h3>
          <p className="text-slate-500 text-sm">
            {filter === "unread" 
              ? "You're all caught up! No unread notifications." 
              : "Notifications will appear here when you have activity."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => {
            const Icon = getIcon(notif.type);
            const colorClass = getColor(notif.type);
            
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-white rounded-xl border-2 p-4 transition-all ${
                  notif.is_read 
                    ? "border-slate-200 opacity-70" 
                    : "border-[#a9d5ed] shadow-sm"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{notif.title}</h4>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-[#3b82c4] rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {notif.created_date ? format(new Date(notif.created_date), "MMM d, h:mm a") : "Just now"}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsReadMutation.mutate(notif.id)}
                        disabled={markAsReadMutation.isPending}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Mark as read"
                      >
                        <CheckCircle className="w-4 h-4 text-slate-400 hover:text-[#5cb83a]" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notif.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 hover:bg-rose-100 rounded-lg transition-colors"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}