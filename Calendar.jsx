import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Car,
  MapPin,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  Check,
  Ban,
  UserX,
  DollarSign
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  isAfter,
  parseISO,
  setHours,
  setMinutes,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getHours,
  getMinutes,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const LESSON_TYPES = [
  { id: "standard", name: "Standard Lesson", duration: 60, color: "bg-indigo-500" },
  { id: "extended", name: "Extended Lesson", duration: 90, color: "bg-purple-500" },
  { id: "highway", name: "Highway Driving", duration: 120, color: "bg-blue-500" },
  { id: "night", name: "Night Driving", duration: 60, color: "bg-slate-700" },
  { id: "parking", name: "Parking Practice", duration: 45, color: "bg-emerald-500" },
  { id: "exam_prep", name: "Exam Preparation", duration: 90, color: "bg-amber-500" },
  { id: "refresher", name: "Refresher Course", duration: 60, color: "bg-teal-500" },
];

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "text-[#b8a525]",
    bgColor: "bg-[#fdfbe8] border-[#f9f3c8]",
    icon: <Clock className="w-3 h-3" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-[#5cb83a]",
    bgColor: "bg-[#eefbe7] border-[#d4f4c3]",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  completed: {
    label: "Completed",
    color: "text-[#3b82c4]",
    bgColor: "bg-[#e8f4fa] border-[#d4eaf5]",
    icon: <Check className="w-3 h-3" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-[#c9342c]",
    bgColor: "bg-[#fdeeed] border-[#f9d4d2]",
    icon: <XCircle className="w-3 h-3" />,
  },
  no_show: {
    label: "No Show",
    color: "text-zinc-700",
    bgColor: "bg-zinc-100 border-zinc-300",
    icon: <UserX className="w-3 h-3" />,
  },
};

const INSTRUCTOR_COLORS = [
  "bg-[#3b82c4]",
  "bg-[#6c376f]",
  "bg-[#a9d5ed]",
  "bg-[#81da5a]",
  "bg-[#e7d356]",
  "bg-[#e44138]",
  "bg-[#5cb83a]",
  "bg-[#2563a3]",
];

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => ({
  hour: Math.floor(i / 2) + 7,
  minute: (i % 2) * 30,
}));

const formatTime = (hour, minute = 0) => {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const getInstructorColor = (instructorId, instructors) => {
  const index = instructors.findIndex((i) => i.id === instructorId);
  return INSTRUCTOR_COLORS[index % INSTRUCTOR_COLORS.length];
};

const BookingCard = React.memo(
  ({
    booking,
    student,
    instructor,
    vehicle,
    isCompact = false,
    onEdit,
    onStatusChange,
    onDelete,
    instructorColor,
  }) => {
    const startTime = parseISO(booking.start_datetime);
    const endTime = parseISO(booking.end_datetime);
    const duration = differenceInMinutes(endTime, startTime);
    const statusConfig = STATUS_CONFIG[booking.status];
    const lessonType = LESSON_TYPES.find((t) => t.id === booking.lesson_type);

    if (isCompact) {
      return (
        <div
          className={`group relative px-2 py-1 rounded-lg text-xs font-medium truncate cursor-pointer transition-all hover:shadow-md ${instructorColor} text-white`}
          onClick={onEdit}
        >
          <span className="truncate">
            {format(startTime, "HH:mm")} - {student?.full_name || "Student"}
          </span>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`group relative rounded-xl border-l-4 ${instructorColor.replace(
          "bg-",
          "border-"
        )} bg-white shadow-sm hover:shadow-md transition-all cursor-pointer`}
        onClick={onEdit}
      >
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg ${instructorColor} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white text-xs font-bold">
                  {instructor?.full_name?.charAt(0) || "I"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {student?.full_name || "Unknown Student"}
                </p>
                <p className="text-xs text-zinc-500">{instructor?.full_name}</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} ({duration} min)
              </span>
            </div>
            {vehicle && (
              <div className="flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                </span>
              </div>
            )}
            {booking.pickup_location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span className="truncate">{booking.pickup_location}</span>
              </div>
            )}
            {lessonType && (
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lessonType.name}</span>
              </div>
            )}
            {booking.price && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                <span>€{booking.price}</span>
              </div>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-zinc-200 p-1"
          onClick={(e) => e.stopPropagation()}
        >
          {booking.status === "pending" && (
            <button
              onClick={() => onStatusChange("confirmed")}
              className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"
              title="Confirm"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {booking.status === "confirmed" && (
            <button
              onClick={() => onStatusChange("completed")}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
              title="Mark Complete"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <button
              onClick={() => onStatusChange("cancelled")}
              className="p-1.5 rounded hover:bg-red-50 text-red-600"
              title="Cancel"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }
);

BookingCard.displayName = "BookingCard";

import EnhancedBookingForm from "../components/calendar/EnhancedBookingForm";
import DragDropCalendar from "../components/calendar/DragDropCalendar";
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";

const WeekView = React.memo(
  ({
    currentDate,
    bookings,
    students,
    instructors,
    vehicles,
    filterInstructor,
    filterStatus,
    onSlotClick,
    onBookingEdit,
    onBookingStatusChange,
    onBookingDelete,
    onBookingDrop,
  }) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    });

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-8 gap-2 mb-3">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <p className="text-xs font-medium text-zinc-500 text-center">Time</p>
            </div>
            {weekDays.map((day) => {
              const dayIsToday = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 rounded-xl border ${
                    dayIsToday
                      ? "bg-[#e8f4fa] border-[#d4eaf5]"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <p
                    className={`text-xs font-medium text-center ${
                      dayIsToday ? "text-[#3b82c4]" : "text-zinc-500"
                    }`}
                  >
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={`text-lg font-bold text-center ${
                      dayIsToday ? "text-[#2563a3]" : "text-zinc-900"
                    }`}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          <DragDropCalendar
            bookings={bookings}
            students={students}
            instructors={instructors}
            vehicles={vehicles}
            timeSlots={TIME_SLOTS}
            days={weekDays}
            onBookingDrop={onBookingDrop}
            onBookingClick={onBookingEdit}
            onSlotClick={onSlotClick}
            filterInstructor={filterInstructor}
            filterStatus={filterStatus}
            isCompact
          />
        </div>
      </div>
    );
  }
);

const DayView = React.memo(
  ({
    currentDate,
    bookings,
    students,
    instructors,
    vehicles,
    filterInstructor,
    filterStatus,
    onSlotClick,
    onBookingEdit,
    onBookingStatusChange,
    onBookingDelete,
    onBookingDrop,
  }) => {
    const activeInstructors = useMemo(() => {
      if (filterInstructor !== "all") {
        return instructors.filter((i) => i.id === filterInstructor);
      }
      return instructors.filter((i) => i.is_active);
    }, [instructors, filterInstructor]);

    return (
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${Math.max(800, activeInstructors.length * 200 + 80)}px` }}>
          <div
            className="grid gap-2 mb-3"
            style={{ gridTemplateColumns: `80px repeat(${activeInstructors.length}, 1fr)` }}
          >
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <p className="text-xs font-medium text-zinc-500 text-center">Time</p>
            </div>
            {activeInstructors.map((instructor, index) => (
              <div
                key={instructor.id}
                className="p-3 rounded-xl bg-zinc-50 border border-zinc-200"
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      INSTRUCTOR_COLORS[index % INSTRUCTOR_COLORS.length]
                    }`}
                  />
                  <p className="text-sm font-medium text-zinc-900">{instructor.full_name}</p>
                </div>
              </div>
            ))}
          </div>

          <DragDropCalendar
            bookings={bookings}
            students={students}
            instructors={instructors}
            vehicles={vehicles}
            timeSlots={TIME_SLOTS}
            days={[currentDate]}
            onBookingDrop={onBookingDrop}
            onBookingClick={onBookingEdit}
            onSlotClick={(slot) => onSlotClick({ ...slot, day: currentDate })}
            filterInstructor={filterInstructor}
            filterStatus={filterStatus}
            isCompact
          />
        </div>
      </div>
    );
  }
);

DayView.displayName = "DayView";

const ListView = React.memo(
  ({ bookings, students, instructors, vehicles, onBookingEdit, onBookingStatusChange, onBookingDelete }) => {
    const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
    const instructorMap = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);
    const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

    const groupedBookings = useMemo(() => {
      const groups = {};
      bookings.forEach((booking) => {
        const dateKey = format(parseISO(booking.start_datetime), "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(booking);
      });
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [bookings]);

    if (bookings.length === 0) {
      return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-600">No bookings found</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {groupedBookings.map(([dateKey, dayBookings]) => {
          const date = parseISO(dateKey);
          const dayIsToday = isToday(date);

          return (
            <div key={dateKey}>
              <div
                className={`flex items-center gap-3 mb-3 px-2 ${
                  dayIsToday ? "text-indigo-600" : "text-zinc-700"
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
                <h3 className="font-semibold">
                  {format(date, "EEEE, MMMM d, yyyy")}
                  {dayIsToday && (
                    <span className="ml-2 text-xs bg-[#e8f4fa] text-[#3b82c4] px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                {dayBookings
                  .sort(
                    (a, b) =>
                      parseISO(a.start_datetime).getTime() -
                      parseISO(b.start_datetime).getTime()
                  )
                  .map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      student={studentMap.get(booking.student_id)}
                      instructor={instructorMap.get(booking.instructor_id)}
                      vehicle={vehicleMap.get(booking.vehicle_id || "")}
                      onEdit={() => onBookingEdit(booking)}
                      onStatusChange={(status) => onBookingStatusChange(booking.id, status)}
                      onDelete={() => onBookingDelete(booking.id)}
                      instructorColor={getInstructorColor(booking.instructor_id, instructors)}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

ListView.displayName = "ListView";

export default function Calendar({ instructorId = null, studentId = null }) {
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");
  const [filterInstructor, setFilterInstructor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolId, setSchoolId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  React.useEffect(() => {
    const loadAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user.role !== "admin") {
          window.location.href = createPageUrl("Unauthorized");
          return;
        }
        const sid = await getEffectiveSchoolId(user);
        setSchoolId(sid);
      } catch (err) {
        logger.error("Failed to load auth:", err);
        window.location.href = createPageUrl("SchoolLogin");
      } finally {
        setLoadingAuth(false);
      }
    };
    loadAuth();
  }, []);

  const { data: bookings = [], isLoading: loadingBookings, error: bookingsError, refetch: refetchBookings } = useQuery({
    queryKey: ["bookings", schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 30000,
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors", schoolId],
    queryFn: () => schoolId ? base44.entities.Instructor.filter({ school_id: schoolId }, "-created_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students", schoolId],
    queryFn: () => schoolId ? base44.entities.Student.filter({ school_id: schoolId }, "-created_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles", schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools", schoolId],
    queryFn: () => schoolId ? base44.entities.School.filter({ id: schoolId }, "-created_date", 1) : [],
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const isLoading = loadingAuth || loadingBookings || loadingInstructors || loadingStudents || loadingVehicles;

  const createBookingMutation = useMutation({
    mutationFn: (data) => {
      const school = schools[0];
      return base44.entities.Booking.create({
        ...data,
        school_id: school?.id || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Lesson created successfully");
      setShowBookingForm(false);
      setSelectedSlot(null);
      setSelectedBooking(null);
    },
    onError: (error) => {
      logger.error("Create booking error:", error);
      toast.error("Failed to create lesson");
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated successfully");
      setShowBookingForm(false);
      setSelectedSlot(null);
      setSelectedBooking(null);
    },
    onError: () => {
      toast.error("Failed to update booking");
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete booking");
    },
  });

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((booking) => {
        const student = students.find((s) => s.id === booking.student_id);
        const instructor = instructors.find((i) => i.id === booking.instructor_id);
        return (
          student?.full_name.toLowerCase().includes(query) ||
          instructor?.full_name.toLowerCase().includes(query) ||
          booking.pickup_location?.toLowerCase().includes(query) ||
          booking.notes?.toLowerCase().includes(query)
        );
      });
    }

    if (filterInstructor !== "all") {
      filtered = filtered.filter((b) => b.instructor_id === filterInstructor);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((b) => b.status === filterStatus);
    }

    if (instructorId) {
      filtered = filtered.filter((b) => b.instructor_id == instructorId);
    }
    if (studentId) {
      filtered = filtered.filter((b) => b.student_id == studentId);
    }

    return filtered;
  }, [bookings, searchQuery, filterInstructor, filterStatus, students, instructors, instructorId, studentId]);

  const navigatePrevious = useCallback(() => {
    switch (viewMode) {
      case "day":
        setCurrentDate((prev) => subDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => subWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate((prev) => subMonths(prev, 1));
        break;
      default:
        break;
    }
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    switch (viewMode) {
      case "day":
        setCurrentDate((prev) => addDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => addWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, 1));
        break;
      default:
        break;
    }
  }, [viewMode]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSlotClick = useCallback((slot) => {
    // Prevent adding booking in the past
    let slotDateTime = setHours(slot.day || slot.date || new Date(), slot.hour);
    slotDateTime = setMinutes(slotDateTime, slot.minute);
    if (isBefore(slotDateTime, new Date())) {
      toast.error("Cannot add booking in the past");
      return;
    }
    setSelectedSlot(slot);
    setSelectedBooking(null);
    setShowBookingForm(true);
  }, []);

  const handleBookingEdit = useCallback((booking) => {
    setSelectedBooking(booking);
    setSelectedSlot(null);
    setShowBookingForm(true);
  }, []);

  const handleBookingStatusChange = useCallback(
    (id, status) => {
      updateBookingMutation.mutate({ id, data: { status } });
    },
    [updateBookingMutation]
  );

  const handleBookingDelete = useCallback(
    (id) => {
      if (window.confirm("Are you sure you want to delete this booking?")) {
        deleteBookingMutation.mutate(id);
      }
    },
    [deleteBookingMutation]
  );

  const handleSaveBooking = useCallback(
    (data) => {
      // Validate new booking before saving
      const newStart = parseISO(data.start_datetime);
      const newEnd = parseISO(data.end_datetime);
      if (isBefore(newEnd, newStart) || newStart.getTime() === newEnd.getTime()) {
        toast.error("End time must be after start time");
        return;
      }
      if (isBefore(newStart, new Date())) {
        toast.error("Cannot add booking in the past");
        return;
      }
      for (const b of bookings) {
        if ((b.instructor_id === data.instructor_id) || (b.student_id === data.student_id)) {
          const bStart = parseISO(b.start_datetime);
          const bEnd = parseISO(b.end_datetime);
          if (bStart < newEnd && bEnd > newStart) {
            toast.error("Booking time conflicts with an existing booking");
            return;
          }
        }
      }
      createBookingMutation.mutate(data);
    },
    [bookings, createBookingMutation]
  );

  const handleUpdateBooking = useCallback(
    (id, data) => {
      // Validate updates (time/instructor/student changes) before saving
      const updatedStart = data.start_datetime ? parseISO(data.start_datetime) : null;
      const updatedEnd = data.end_datetime ? parseISO(data.end_datetime) : null;
      const origBooking = bookings.find((b) => b.id === id);
      const finalStart = updatedStart || (origBooking ? parseISO(origBooking.start_datetime) : null);
      const finalEnd = updatedEnd || (origBooking ? parseISO(origBooking.end_datetime) : null);
      const finalInstructor = data.instructor_id || (origBooking ? origBooking.instructor_id : null);
      const finalStudent = data.student_id || (origBooking ? origBooking.student_id : null);
      if ((updatedStart || updatedEnd) && finalStart && finalEnd && (isBefore(finalEnd, finalStart) || finalStart.getTime() === finalEnd.getTime())) {
        toast.error("End time must be after start time");
        return;
      }
      if (updatedStart && finalStart && isBefore(finalStart, new Date())) {
        toast.error("Cannot set booking in the past");
        return;
      }
      for (const b of bookings) {
        if (b.id !== id && ((b.instructor_id === finalInstructor) || (b.student_id === finalStudent))) {
          const bStart = parseISO(b.start_datetime);
          const bEnd = parseISO(b.end_datetime);
          if (finalStart && finalEnd && bStart < finalEnd && bEnd > finalStart) {
            toast.error("Booking time conflicts with an existing booking");
            return;
          }
        }
      }
      updateBookingMutation.mutate({ id, data });
    },
    [bookings, updateBookingMutation]
  );

  const handleBookingDrop = useCallback(
    (bookingId, newTimeData) => {
      // Validate drag-and-drop scheduling changes
      const origBookingDrop = bookings.find((b) => b.id === bookingId);
      const newStart = newTimeData.start_datetime ? parseISO(newTimeData.start_datetime) : (origBookingDrop ? parseISO(origBookingDrop.start_datetime) : null);
      const newEnd = newTimeData.end_datetime ? parseISO(newTimeData.end_datetime) : (origBookingDrop ? parseISO(origBookingDrop.end_datetime) : null);
      const newInstructor = newTimeData.instructor_id || (origBookingDrop ? origBookingDrop.instructor_id : null);
      const newStudent = newTimeData.student_id || (origBookingDrop ? origBookingDrop.student_id : null);
      if (newStart && newEnd) {
        if (isBefore(newEnd, newStart) || newStart.getTime() === newEnd.getTime()) {
          toast.error("End time must be after start time");
          return;
        }
        if (isBefore(newStart, new Date())) {
          toast.error("Cannot set booking in the past");
          return;
        }
      }
      for (const b of bookings) {
        if (b.id !== bookingId && ((b.instructor_id === newInstructor) || (b.student_id === newStudent))) {
          const bStart = parseISO(b.start_datetime);
          const bEnd = parseISO(b.end_datetime);
          if (newStart && newEnd && bStart < newEnd && bEnd > newStart) {
            toast.error("Booking time conflicts with an existing booking");
            return;
          }
        }
      }
      updateBookingMutation.mutate({ id: bookingId, data: newTimeData });
    },
    [bookings, updateBookingMutation]
  );

  const handleCloseForm = useCallback(() => {
    setShowBookingForm(false);
    setSelectedSlot(null);
    setSelectedBooking(null);
  }, []);

  const getDateRangeLabel = useCallback(() => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      }
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "list":
        return "All Bookings";
      default:
        return "";
    }
  }, [viewMode, currentDate]);

  const todayStats = useMemo(() => {
    const todayBookings = bookings.filter((b) => isToday(parseISO(b.start_datetime)));
    return {
      total: todayBookings.length,
      confirmed: todayBookings.filter((b) => b.status === "confirmed").length,
      pending: todayBookings.filter((b) => b.status === "pending").length,
      completed: todayBookings.filter((b) => b.status === "completed").length,
    };
  }, [bookings]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <SkeletonLoader count={4} type="card" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">School Not Found</h3>
          <p className="text-gray-600">Please complete your school setup first.</p>
        </div>
      </div>
    );
  }

  if (bookingsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={bookingsError} 
          onRetry={refetchBookings}
          title="Failed to load calendar"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-8">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent mb-1">
              Calendar & Scheduling
            </h1>
            <p className="text-zinc-600">Manage all lessons and appointments</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#3b82c4] tabular-nums">
                  {todayStats.total}
                </p>
                <p className="text-xs text-zinc-500">Today</p>
              </div>
              <div className="w-px h-8 bg-zinc-200" />
              <div className="text-center">
                <p className="text-lg font-semibold text-[#5cb83a] tabular-nums">
                  {todayStats.confirmed}
                </p>
                <p className="text-xs text-zinc-500">Confirmed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-[#b8a525] tabular-nums">
                  {todayStats.pending}
                </p>
                <p className="text-xs text-zinc-500">Pending</p>
              </div>
            </div>

            <button
              onClick={() => setShowBookingForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] shadow-sm transition"
            >
              <Plus className="w-5 h-5" />
              New Booking
            </button>
          </div>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={navigatePrevious}
              className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-700" />
            </button>

            <div className="px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 min-w-[200px] text-center">
              <p className="text-sm font-semibold text-zinc-900">{getDateRangeLabel()}</p>
            </div>

            <button
              onClick={navigateNext}
              className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition"
            >
              <ChevronRight className="w-5 h-5 text-zinc-700" />
            </button>

            <button
              onClick={navigateToday}
              className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition"
            >
              <span className="text-sm font-medium text-zinc-700">Today</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookings..."
                className="pl-9 pr-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] w-48"
              />
            </div>

            {(!instructorId && !studentId) && (
              <select
                value={filterInstructor}
                onChange={(e) => setFilterInstructor(e.target.value)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
              >
                <option value="all">All Instructors</option>
                {instructors
                  .filter((i) => i.is_active)
                  .map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.full_name}
                    </option>
                  ))}
              </select>
            )}

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            <div className="flex items-center rounded-xl border border-zinc-200 p-1 bg-zinc-50">
              {["day", "week", "month", "list"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    viewMode === mode
                      ? "bg-white text-[#3b82c4] shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {mode === "day" && <CalendarIcon className="w-4 h-4" />}
                  {mode === "week" && <Grid3X3 className="w-4 h-4" />}
                  {mode === "month" && <CalendarIcon className="w-4 h-4" />}
                  {mode === "list" && <List className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-6 shadow-sm"
      >
        {viewMode === "week" && (
          <WeekView
            currentDate={currentDate}
            bookings={filteredBookings}
            students={students}
            instructors={instructors}
            vehicles={vehicles}
            filterInstructor={filterInstructor}
            filterStatus={filterStatus}
            onSlotClick={handleSlotClick}
            onBookingEdit={handleBookingEdit}
            onBookingStatusChange={handleBookingStatusChange}
            onBookingDelete={handleBookingDelete}
            onBookingDrop={handleBookingDrop}
          />
        )}

        {viewMode === "day" && (
          <DayView
            currentDate={currentDate}
            bookings={filteredBookings}
            students={students}
            instructors={instructors}
            vehicles={vehicles}
            filterInstructor={filterInstructor}
            filterStatus={filterStatus}
            onSlotClick={handleSlotClick}
            onBookingEdit={handleBookingEdit}
            onBookingStatusChange={handleBookingStatusChange}
            onBookingDelete={handleBookingDelete}
            onBookingDrop={handleBookingDrop}
          />
        )}

        {viewMode === "list" && (
          <ListView
            bookings={filteredBookings}
            students={students}
            instructors={instructors}
            vehicles={vehicles}
            onBookingEdit={handleBookingEdit}
            onBookingStatusChange={handleBookingStatusChange}
            onBookingDelete={handleBookingDelete}
          />
        )}

        {viewMode === "month" && (
          <div className="text-center py-12 text-zinc-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
            <p>Month view coming soon</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-6">
          <p className="text-sm font-medium text-zinc-700">Legend:</p>
          {instructors
            .filter((i) => i.is_active)
            .slice(0, 8)
            .map((instructor, index) => (
              <div key={instructor.id} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    INSTRUCTOR_COLORS[index % INSTRUCTOR_COLORS.length]
                  }`}
                />
                <span className="text-sm text-zinc-600">{instructor.full_name}</span>
              </div>
            ))}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-zinc-300 bg-zinc-100 opacity-50" />
            <span className="text-sm text-zinc-500">Past Time</span>
          </div>
        </div>
      </motion.div>

      <EnhancedBookingForm
        isOpen={showBookingForm}
        onClose={handleCloseForm}
        booking={selectedBooking}
        selectedSlot={selectedSlot}
        students={studentId ? students.filter((s) => s.id === studentId) : students}
        instructors={instructorId ? instructors.filter((i) => i.id === instructorId) : instructors}
        vehicles={vehicles}
        existingBookings={bookings}
        schools={schools}
        onSave={handleSaveBooking}
        onUpdate={handleUpdateBooking}
      />
    </div>
  );
}