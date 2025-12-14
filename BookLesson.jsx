import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";
import SmartScheduler from "@/components/booking/SmartScheduler";
import PreviousInstructors from "@/components/booking/PreviousInstructors";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Car, 
  User, 
  MapPin, 
  Check, 
  ArrowLeft, 
  Repeat, 
  Layers, 
  Sparkles, 
  Users,
  Star,
  Award,
  TrendingUp,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle,
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  Shield,
  Zap,
  Target,
  Heart,
  ThumbsUp,
  Navigation,
  Filter,
  SlidersHorizontal,
  X,
  Plus,
  Minus,
  CreditCard,
  Package,
  BookOpen,
  Video,
  Gauge
} from "lucide-react";
import { format, addDays, startOfWeek, addHours, isSameDay, startOfDay, endOfDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import VeeMascot, { VeeTip, VeeSuccess } from "@/components/common/VeeMascot";
import BookingAssistant from "@/components/booking/BookingAssistant";
import { useStudentAuth } from "@/components/student/useStudentAuth";
import StudentOnboarding from "@/components/student/StudentOnboarding";
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import { logger } from "@/components/utils/config";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";

export default function BookLesson() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: All hooks must be called before any conditional returns
  const auth = useStudentAuth();
  
  // Derive auth values immediately after auth hook (needed for other hooks)
  const effectiveUser = auth.data?.effectiveUser || null;
  const effectiveStudent = auth.data?.effectiveStudent || null;
  const authStatus = auth.data?.status || "loading";
  
  const [schoolId, setSchoolId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [useCustomDropoff, setUseCustomDropoff] = useState(false);
  const [lessonNotes, setLessonNotes] = useState("");
  const [step, setStep] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isGroupLesson, setIsGroupLesson] = useState(false);
  const [selectedLessonType, setSelectedLessonType] = useState("standard");
  const [lessonDuration, setLessonDuration] = useState(60);
  const [preferredInstructorGender, setPreferredInstructorGender] = useState("any");
  const [filters, setFilters] = useState({
    experience: "any",
    rating: 0,
    transmission: "any",
    languages: []
  });

  useEffect(() => {
    const loadSchoolId = async () => {
      if (!effectiveStudent) return;
      try {
        const sid = effectiveStudent.school_id || await getEffectiveSchoolId(effectiveUser);
        setSchoolId(sid);
        setPickupLocation(effectiveStudent.address || effectiveStudent.pickup_zone || "");
      } catch (err) {
        logger.error("Failed to get school ID:", err);
      }
    };
    loadSchoolId();
  }, [effectiveStudent, effectiveUser]);

  const { data: instructors = [], isLoading: loadingInstructors, error: instructorsError, refetch: refetchInstructors } = useQuery({
    queryKey: ['instructors', schoolId],
    queryFn: () => schoolId ? base44.entities.Instructor.filter({ school_id: schoolId, is_active: true }, "-rating", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: vehicles = [], isLoading: loadingVehicles, error: vehiclesError, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles', schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId, is_available: true }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['serviceTemplates', schoolId],
    queryFn: () => schoolId ? base44.entities.ServiceTemplate.filter({ school_id: schoolId, is_active: true }, "-created_date", 20) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['allBookings', schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId, status: { $in: ["confirmed", "in_progress"] } }, "-start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', schoolId],
    queryFn: () => schoolId ? base44.entities.Review.filter({ school_id: schoolId, is_visible: true }, "-created_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['studentPackages', effectiveStudent?.id, schoolId],
    queryFn: () => effectiveStudent && schoolId ? base44.entities.Package.filter({ student_id: effectiveStudent.id, school_id: schoolId }, "-created_date", 20) : [],
    enabled: !!effectiveStudent && !!schoolId,
    staleTime: 300000,
  });

  const { data: schools = [], isLoading: loadingSchool } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolId ? base44.entities.School.filter({ id: schoolId }, "-created_date", 1) : [],
    enabled: !!schoolId,
    staleTime: 600000,
  });

  // Get the school for the selected instructor
  const selectedSchool = useMemo(() => {
    if (!selectedInstructor?.school_id || !schools.length) return null;
    return schools.find(s => s.id === selectedInstructor.school_id);
  }, [selectedInstructor, schools]);

  // Default school address for pickup/dropoff
  const schoolAddress = useMemo(() => {
    if (!selectedSchool) return "";
    return [selectedSchool.address, selectedSchool.city, selectedSchool.postal_code]
      .filter(Boolean)
      .join(", ");
  }, [selectedSchool]);

  // Set default locations when school is selected
  useEffect(() => {
    if (schoolAddress && !useCustomPickup) {
      setPickupLocation(schoolAddress);
    }
    if (schoolAddress && !useCustomDropoff) {
      setDropoffLocation(schoolAddress);
    }
  }, [schoolAddress, useCustomPickup, useCustomDropoff]);

  const createBookingMutation = useMutation({
    mutationFn: (bookingData) => base44.entities.Booking.create(bookingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingBookings'] });
      queryClient.invalidateQueries({ queryKey: ['allBookings'] });
      queryClient.invalidateQueries({ queryKey: ['studentPackages'] });
      toast.success("Lesson booked successfully!");
      navigate(createPageUrl("StudentDashboard"));
    },
    onError: (error) => {
      logger.error("Booking error:", error);
      toast.error("Failed to book lesson. Please try again.");
    }
  });

  const calculateInstructorScore = (instructor) => {
    let score = 50;
    
    const instructorReviews = reviews.filter(r => r.instructor_id === instructor.id);
    const avgRating = instructorReviews.length > 0
      ? instructorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / instructorReviews.length
      : instructor.rating || 0;
    
    score += (avgRating / 5) * 30;
    
    const yearsExp = instructor.years_experience || 0;
    score += Math.min(yearsExp * 2, 15);
    
    if (preferredInstructorGender !== "any" && instructor.gender === preferredInstructorGender) {
      score += 5;
    }
    
    return Math.min(Math.round(score), 100);
  };

  const matchedInstructors = useMemo(() => {
    if (!instructors.length) return [];
    
    return instructors
      .filter(i => i.is_active)
      .filter(i => {
        if (filters.experience !== "any") {
          const years = i.years_experience || 0;
          if (filters.experience === "beginner" && years >= 3) return false;
          if (filters.experience === "experienced" && (years < 3 || years >= 10)) return false;
          if (filters.experience === "expert" && years < 10) return false;
        }
        
        if (filters.rating > 0) {
          const instructorReviews = reviews.filter(r => r.instructor_id === i.id);
          const avgRating = instructorReviews.length > 0
            ? instructorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / instructorReviews.length
            : i.rating || 0;
          if (avgRating < filters.rating) return false;
        }
        
        if (preferredInstructorGender !== "any" && i.gender !== preferredInstructorGender) {
          return false;
        }
        
        return true;
      })
      .map(instructor => ({
        instructor,
        score: calculateInstructorScore(instructor)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [instructors, reviews, filters, preferredInstructorGender]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.is_available && 
      (!selectedInstructor || v.school_id === selectedInstructor.school_id) &&
      (filters.transmission === "any" || v.transmission?.toLowerCase() === filters.transmission.toLowerCase())
    );
  }, [vehicles, selectedInstructor, filters.transmission]);

  const getAvailableSlots = () => {
    if (!selectedInstructor || !selectedDate) return [];
    
    const startHour = 8;
    const endHour = 20;
    const slots = [];
    
    const dayStart = startOfDay(selectedDate);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = addHours(dayStart, hour);
      
      const isBooked = allBookings.some(booking => {
        if (booking.instructor_id !== selectedInstructor.id) return false;
        
        const bookingStart = new Date(booking.start_datetime);
        const bookingEnd = new Date(booking.end_datetime);
        
        return slotTime >= bookingStart && slotTime < bookingEnd;
      });
      
      if (!isBooked) {
        slots.push({
          time: format(slotTime, "HH:mm"),
          datetime: slotTime.toISOString(),
          available: true
        });
      }
    }
    
    return slots;
  };

  const availableSlots = getAvailableSlots();

  const activePackage = packages.find(p => (p.lessons_remaining || 0) > 0);

  const lessonTypes = [
    { 
      id: "standard", 
      name: "Standard Lesson", 
      icon: Car, 
      description: "Regular driving practice",
      price: 50,
      duration: 60
    },
    { 
      id: "intensive", 
      name: "Intensive Training", 
      icon: Zap, 
      description: "Extended 2-hour session",
      price: 90,
      duration: 120
    },
    { 
      id: "test_prep", 
      name: "Test Preparation", 
      icon: Target, 
      description: "Focused exam practice",
      price: 60,
      duration: 90
    },
    { 
      id: "motorway", 
      name: "Motorway Driving", 
      icon: Navigation, 
      description: "Highway driving skills",
      price: 65,
      duration: 90
    },
    { 
      id: "night", 
      name: "Night Driving", 
      icon: Clock, 
      description: "Evening/night practice",
      price: 55,
      duration: 60
    }
  ];

  const selectedLessonTypeData = lessonTypes.find(lt => lt.id === selectedLessonType);

  const handleBookLesson = async () => {
    if (!selectedInstructor) {
      toast.error("Please select an instructor");
      return;
    }
    if (!selectedVehicle) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!selectedTimeSlot) {
      toast.error("Please select a time slot");
      return;
    }
    if (!effectiveStudent) {
      toast.error("Student profile not found. Please contact support.");
      return;
    }

    if (useCustomPickup && !pickupLocation.trim()) {
      toast.error("Please enter a custom pickup location");
      return;
    }

    if (useCustomDropoff && !dropoffLocation.trim()) {
      toast.error("Please enter a custom drop-off location");
      return;
    }

    if (!selectedInstructor.school_id) {
      toast.error("Instructor school information is missing");
      return;
    }

    const [hours, minutes] = selectedTimeSlot.split(':');
    const startDate = new Date(selectedDate);
    startDate.setHours(parseInt(hours), parseInt(minutes), 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getMinutes() + lessonDuration);

    // Check for booking conflicts
    const hasConflict = allBookings.some(b => {
      if (b.instructor_id !== selectedInstructor.id) return false;
      const bStart = new Date(b.start_datetime);
      const bEnd = new Date(b.end_datetime);
      return (startDate >= bStart && startDate < bEnd) || (endDate > bStart && endDate <= bEnd);
    });

    if (hasConflict) {
      toast.error("This time slot is no longer available. Please select another time.");
      return;
    }

    const lessonPrice = selectedLessonTypeData?.price || 50;
    const pickupFee = useCustomPickup && selectedSchool?.offers_custom_pickup ? (selectedSchool.custom_pickup_fee || 0) : 0;
    const dropoffFee = useCustomDropoff && selectedSchool?.offers_custom_dropoff ? (selectedSchool.custom_dropoff_fee || 0) : 0;
    const totalPrice = lessonPrice + pickupFee + dropoffFee;

    // Use school address as default if not using custom location
    const finalPickupLocation = useCustomPickup ? pickupLocation : (schoolAddress || pickupLocation);
    const finalDropoffLocation = useCustomDropoff ? dropoffLocation : (schoolAddress || dropoffLocation || finalPickupLocation);

    const bookingData = {
      school_id: selectedInstructor.school_id,
      student_id: effectiveStudent.id,
      instructor_id: selectedInstructor.id,
      vehicle_id: selectedVehicle.id,
      service_template_id: serviceTemplates[0]?.id,
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      pickup_location: finalPickupLocation,
      dropoff_location: finalDropoffLocation,
      is_custom_pickup: useCustomPickup,
      pickup_fee: pickupFee,
      is_custom_dropoff: useCustomDropoff,
      dropoff_fee: dropoffFee,
      status: "confirmed",
      lesson_type: selectedLessonType,
      price: totalPrice,
      payment_status: activePackage ? "paid" : "unpaid",
      is_group_lesson: isGroupLesson,
      notes: lessonNotes,
      duration_minutes: lessonDuration
    };

    createBookingMutation.mutate(bookingData);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      experience: "any",
      rating: 0,
      transmission: "any",
      languages: []
    });
    setPreferredInstructorGender("any");
  };

  const stepTitles = [
    "Choose Your Instructor",
    "Select a Vehicle",
    "Pick Date & Time",
    "Review & Confirm"
  ];

  // Auth checks
  if (auth.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SkeletonLoader count={4} type="card" />
      </div>
    );
  }

  if (authStatus === "unauthenticated" || !effectiveUser) {
    window.location.href = createPageUrl("StudentAuth");
    return null;
  }

  if (authStatus === "no_student" || !effectiveStudent) {
    return <StudentOnboarding user={effectiveUser} onComplete={() => window.location.reload()} />;
  }

  // Error states
  if (instructorsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <QueryErrorBoundary 
          error={instructorsError} 
          onRetry={refetchInstructors}
          title="Failed to load instructors"
        />
      </div>
    );
  }

  if (vehiclesError && step === 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <QueryErrorBoundary 
          error={vehiclesError} 
          onRetry={refetchVehicles}
          title="Failed to load vehicles"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => step === 1 ? navigate(createPageUrl("StudentDashboard")) : setStep(step - 1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? "Back to Dashboard" : "Previous Step"}
        </button>

        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Book a Lesson</h1>
            <p className="text-gray-600 mt-1">{stepTitles[step - 1]}</p>
          </div>
          
          {activePackage && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#eefbe7] border border-[#d4f4c3] rounded-xl">
              <Package className="w-5 h-5 text-[#5cb83a]" />
              <div>
                <p className="text-xs text-[#4a9c2e] font-medium">Active Package</p>
                <p className="text-sm font-bold text-[#1a4314]">{activePackage.lessons_remaining} lessons left</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((stepNum, index) => (
            <React.Fragment key={stepNum}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                  step > stepNum 
                    ? "bg-gradient-to-br from-[#81da5a] to-[#5cb83a] text-white" 
                    : step === stepNum 
                    ? "bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed] text-white animate-pulse" 
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {step > stepNum ? <Check className="w-5 h-5" /> : stepNum}
                </div>
                <span className={`hidden md:block text-sm font-semibold ${
                  step >= stepNum ? "text-gray-900" : "text-gray-500"
                }`}>
                  {stepTitles[stepNum - 1]}
                </span>
              </div>
              {index < 3 && (
                <div className={`hidden md:block flex-1 h-1 mx-4 rounded-full ${
                  step > stepNum ? "bg-[#81da5a]" : "bg-gray-200"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <PreviousInstructors 
              studentId={effectiveStudent?.id}
              instructors={instructors}
              onSelect={(instructor) => {
                setSelectedInstructor(instructor);
                setStep(2);
                toast.success(`Selected ${instructor.full_name}`);
              }}
            />

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#3b82c4]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">AI-Matched Instructors</h2>
                    <p className="text-sm text-gray-600">Ranked by compatibility, experience, and ratings</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                </button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-gray-50 rounded-xl overflow-hidden"
                  >
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                        <select
                          value={filters.experience}
                          onChange={(e) => handleFilterChange("experience", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                        >
                          <option value="any">Any Experience</option>
                          <option value="beginner">Beginner Friendly (0-3 years)</option>
                          <option value="experienced">Experienced (3-10 years)</option>
                          <option value="expert">Expert (10+ years)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                        <select
                          value={filters.rating}
                          onChange={(e) => handleFilterChange("rating", Number(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                        >
                          <option value="0">Any Rating</option>
                          <option value="3">3+ Stars</option>
                          <option value="4">4+ Stars</option>
                          <option value="4.5">4.5+ Stars</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                        <select
                          value={filters.transmission}
                          onChange={(e) => handleFilterChange("transmission", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                        >
                          <option value="any">Any Transmission</option>
                          <option value="manual">Manual</option>
                          <option value="automatic">Automatic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructor Gender</label>
                        <select
                          value={preferredInstructorGender}
                          onChange={(e) => setPreferredInstructorGender(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                        >
                          <option value="any">No Preference</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={resetFilters}
                      className="text-sm font-medium text-[#3b82c4] hover:text-[#2563a3]"
                    >
                      Reset All Filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingInstructors ? (
                <SkeletonLoader count={4} type="card" />
              ) : matchedInstructors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <VeeMascot size="lg" mood="thinking" />
                  </div>
                  <p className="text-gray-900 font-medium mb-2">Hmm, no instructors match those filters</p>
                  <p className="text-gray-600 mb-4">Let me help you find the right match</p>
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-[#3b82c4] text-white rounded-lg font-semibold hover:bg-[#2563a3] transition"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {matchedInstructors.map(({ instructor, score }, idx) => {
                    const instructorReviews = reviews.filter(r => r.instructor_id === instructor.id);
                    const avgRating = instructorReviews.length > 0
                      ? instructorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / instructorReviews.length
                      : instructor.rating || 5;

                    return (
                      <motion.button
                        key={instructor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          setSelectedInstructor(instructor);
                          setStep(2);
                          toast.success(`Selected ${instructor.full_name}`);
                        }}
                        className="relative bg-white border-2 border-gray-200 hover:border-[#a9d5ed] rounded-2xl p-6 text-left transition group"
                        aria-label={`Select ${instructor.full_name} as your instructor`}
                      >
                        {score >= 85 && idx === 0 && (
                          <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-[#e7d356] to-[#d4bf2e] text-[#5c4d0a] rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Best Match
                          </div>
                        )}

                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-white text-2xl font-bold">
                              {instructor.full_name?.charAt(0) || "I"}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                              {instructor.full_name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {instructor.years_experience || 0} years experience
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < Math.floor(avgRating)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-semibold text-gray-900">
                                {avgRating.toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({instructorReviews.length} reviews)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {instructor.certifications?.slice(0, 3).map((cert, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-[#e8f4fa] text-[#3b82c4] rounded-full text-xs font-semibold"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Match Score</span>
                            <span className="text-lg font-bold text-[#3b82c4]">{score}%</span>
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.1 }}
                              className="absolute h-full bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed]"
                            />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#f3e8f4] rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-[#6c376f]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Select Your Vehicle</h2>
                  <p className="text-sm text-gray-600">Choose from available vehicles</p>
                </div>
              </div>

              {availableVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <VeeMascot size="lg" mood="thinking" />
                  </div>
                  <p className="text-gray-900 font-medium mb-2">No vehicles available right now</p>
                  <p className="text-gray-600 mb-4">Try selecting a different instructor</p>
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Back to Instructors
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {availableVehicles.map((vehicle, idx) => (
                    <motion.button
                      key={vehicle.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setStep(3);
                        toast.success(`Selected ${vehicle.make} ${vehicle.model}`);
                      }}
                      className="bg-white border-2 border-gray-200 hover:border-[#e5d0e6] rounded-2xl p-6 text-left transition group"
                      aria-label={`Select ${vehicle.make} ${vehicle.model}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#f3e8f4] to-[#e5d0e6] rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Car className="w-8 h-8 text-[#6c376f]" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{vehicle.year}</p>

                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                              {vehicle.transmission}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                              {vehicle.license_plate}
                            </span>
                            {vehicle.fuel_type && (
                              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                                {vehicle.fuel_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Select Lesson Type</h2>
                  <p className="text-sm text-gray-600">Choose the type of lesson you need</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {lessonTypes.map((lessonType) => (
                  <button
                    key={lessonType.id}
                    onClick={() => {
                      setSelectedLessonType(lessonType.id);
                      setLessonDuration(lessonType.duration);
                    }}
                    className={`p-4 border-2 rounded-xl text-left transition ${
                      selectedLessonType === lessonType.id
                        ? "border-[#3b82c4] bg-[#e8f4fa]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <lessonType.icon className={`w-6 h-6 mb-3 ${
                      selectedLessonType === lessonType.id ? "text-[#3b82c4]" : "text-gray-600"
                    }`} />
                    <h3 className="font-bold text-gray-900 mb-1">{lessonType.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">{lessonType.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#3b82c4]">€{lessonType.price}</span>
                      <span className="text-xs text-gray-500">{lessonType.duration} min</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pick Date & Time</h2>
                  <p className="text-sm text-gray-600">Select when you'd like your lesson</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Date</label>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)).map((date) => {
                      const isSelected = isSameDay(date, selectedDate);
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`p-2 rounded-xl text-center transition ${
                            isSelected
                              ? "bg-[#3b82c4] text-white"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <div className="text-xs font-medium">{format(date, "EEE")}</div>
                          <div className="text-lg font-bold">{format(date, "d")}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Time</label>
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No available slots for this date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => {
                            setSelectedTimeSlot(slot.time);
                            setStep(4);
                          }}
                          className="p-3 border-2 border-gray-200 hover:border-[#a9d5ed] rounded-xl font-semibold text-gray-900 transition"
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#eefbe7] rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#5cb83a]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review Your Booking</h2>
                  <p className="text-sm text-gray-600">Confirm all details before booking</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] border border-[#d4eaf5] rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#3b82c4] rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#2563a3] font-medium">Instructor</p>
                      <p className="text-lg font-bold text-gray-900">{selectedInstructor?.full_name}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#f3e8f4] to-[#e5d0e6] border border-[#e5d0e6] rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#6c376f] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#5a2d5d] font-medium">Vehicle</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedVehicle?.make} {selectedVehicle?.model}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] border border-[#d4eaf5] rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#3b82c4] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#2563a3] font-medium">Lesson Type</p>
                      <p className="text-lg font-bold text-gray-900">{selectedLessonTypeData?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] border border-[#d4eaf5] rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#3b82c4] rounded-xl flex items-center justify-center flex-shrink-0">
                      <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#2563a3] font-medium">Date & Time</p>
                      <p className="text-lg font-bold text-gray-900">
                        {format(selectedDate, "EEEE, MMMM d")} at {selectedTimeSlot}
                      </p>
                      <p className="text-sm text-gray-600">{lessonDuration} minutes</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* Pickup Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location
                  </label>
                  
                  {/* Default school location */}
                  <div 
                    onClick={() => {
                      setUseCustomPickup(false);
                      setPickupLocation(schoolAddress);
                    }}
                    className={`p-4 border-2 rounded-xl mb-3 cursor-pointer transition ${
                      !useCustomPickup 
                        ? "border-[#3b82c4] bg-[#e8f4fa]" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        !useCustomPickup ? "border-[#3b82c4] bg-[#3b82c4]" : "border-gray-300"
                      }`}>
                        {!useCustomPickup && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">School Address (Default)</p>
                        <p className="text-sm text-gray-600">{schoolAddress || "Loading..."}</p>
                      </div>
                      <span className="text-sm font-bold text-[#5cb83a]">Free</span>
                    </div>
                  </div>

                  {/* Custom pickup option */}
                  {selectedSchool?.offers_custom_pickup && (
                    <div 
                      onClick={() => {
                        setUseCustomPickup(true);
                        setPickupLocation("");
                      }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                        useCustomPickup 
                          ? "border-[#3b82c4] bg-[#e8f4fa]" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          useCustomPickup ? "border-[#3b82c4] bg-[#3b82c4]" : "border-gray-300"
                        }`}>
                          {useCustomPickup && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Custom Pickup Location</p>
                          <p className="text-sm text-gray-600">Get picked up from your preferred address</p>
                        </div>
                        <span className="text-sm font-bold text-[#e7d356]">+€{selectedSchool.custom_pickup_fee || 0}</span>
                      </div>
                      
                      {useCustomPickup && (
                        <div className="relative mt-3">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={pickupLocation}
                            onChange={(e) => setPickupLocation(e.target.value)}
                            placeholder="Enter your pickup address"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dropoff Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drop-off Location
                  </label>
                  
                  {/* Default school location */}
                  <div 
                    onClick={() => {
                      setUseCustomDropoff(false);
                      setDropoffLocation(schoolAddress);
                    }}
                    className={`p-4 border-2 rounded-xl mb-3 cursor-pointer transition ${
                      !useCustomDropoff 
                        ? "border-[#3b82c4] bg-[#e8f4fa]" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        !useCustomDropoff ? "border-[#3b82c4] bg-[#3b82c4]" : "border-gray-300"
                      }`}>
                        {!useCustomDropoff && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">School Address (Default)</p>
                        <p className="text-sm text-gray-600">{schoolAddress || "Loading..."}</p>
                      </div>
                      <span className="text-sm font-bold text-[#5cb83a]">Free</span>
                    </div>
                  </div>

                  {/* Custom dropoff option */}
                  {selectedSchool?.offers_custom_dropoff && (
                    <div 
                      onClick={() => {
                        setUseCustomDropoff(true);
                        setDropoffLocation("");
                      }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                        useCustomDropoff 
                          ? "border-[#3b82c4] bg-[#e8f4fa]" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          useCustomDropoff ? "border-[#3b82c4] bg-[#3b82c4]" : "border-gray-300"
                        }`}>
                          {useCustomDropoff && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Custom Drop-off Location</p>
                          <p className="text-sm text-gray-600">Get dropped off at your preferred address</p>
                        </div>
                        <span className="text-sm font-bold text-[#e7d356]">+€{selectedSchool.custom_dropoff_fee || 0}</span>
                      </div>
                      
                      {useCustomDropoff && (
                        <div className="relative mt-3">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={dropoffLocation}
                            onChange={(e) => setDropoffLocation(e.target.value)}
                            placeholder="Enter your drop-off address"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={lessonNotes}
                    onChange={(e) => setLessonNotes(e.target.value)}
                    placeholder="Any special requests or focus areas for this lesson?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] resize-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Lesson Price</span>
                    <span className="font-semibold text-gray-900">€{selectedLessonTypeData?.price || 50}</span>
                  </div>
                  
                  {useCustomPickup && selectedSchool?.offers_custom_pickup && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Custom Pickup Fee</span>
                      <span className="font-semibold text-[#e7d356]">+€{selectedSchool.custom_pickup_fee || 0}</span>
                    </div>
                  )}
                  
                  {useCustomDropoff && selectedSchool?.offers_custom_dropoff && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Custom Drop-off Fee</span>
                      <span className="font-semibold text-[#e7d356]">+€{selectedSchool.custom_dropoff_fee || 0}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Total</span>
                      <span className="text-2xl font-bold text-gray-900">
                        €{(selectedLessonTypeData?.price || 50) + 
                          (useCustomPickup && selectedSchool?.offers_custom_pickup ? (selectedSchool.custom_pickup_fee || 0) : 0) +
                          (useCustomDropoff && selectedSchool?.offers_custom_dropoff ? (selectedSchool.custom_dropoff_fee || 0) : 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {activePackage && (
                  <div className="flex items-center gap-2 text-sm text-[#4a9c2e] bg-[#eefbe7] px-3 py-2 rounded-lg">
                    <Package className="w-4 h-4" />
                    <span className="font-medium">
                      Will use 1 lesson from your package ({activePackage.lessons_remaining} remaining)
                    </span>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBookLesson}
                disabled={createBookingMutation.isPending || (useCustomPickup && !pickupLocation.trim()) || (useCustomDropoff && !dropoffLocation.trim())}
                className="w-full py-4 bg-gradient-to-r from-[#3b82c4] to-[#2563a3] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {createBookingMutation.isPending ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Booking
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Booking Assistant */}
      <BookingAssistant
        packages={packages}
        instructors={instructors}
        lessonTypes={lessonTypes}
        student={effectiveStudent}
        allBookings={allBookings}
        currentStep={step}
        selectedInstructor={selectedInstructor}
        selectedDate={selectedDate}
        onSelectPackage={(packageId) => {
          const pkg = packages.find(p => p.id === packageId);
          if (pkg) {
            toast.success(`Selected ${pkg.name} package`);
          }
        }}
        onSelectLessonType={(lessonTypeId) => {
          setSelectedLessonType(lessonTypeId);
          const lt = lessonTypes.find(l => l.id === lessonTypeId);
          if (lt) {
            setLessonDuration(lt.duration);
            toast.success(`Selected ${lt.name}`);
          }
        }}
        onSelectInstructor={(instructor) => {
          setSelectedInstructor(instructor);
          setStep(2);
          toast.success(`Selected ${instructor.full_name}`);
        }}
        onSelectDateTime={(dateTime) => {
          if (dateTime.date) setSelectedDate(dateTime.date);
          if (dateTime.time) {
            setSelectedTimeSlot(dateTime.time);
            setStep(4);
          }
        }}
        onApplySuggestion={(suggestion) => {
          if (suggestion.type === "instructor_preference") {
            if (suggestion.experience && suggestion.experience !== "any") {
              setFilters(prev => ({ ...prev, experience: suggestion.experience }));
            }
            if (suggestion.gender && suggestion.gender !== "any") {
              setPreferredInstructorGender(suggestion.gender);
            }
          }
          if (suggestion.type === "lesson_type_recommendation" && suggestion.lessonTypeId) {
            setSelectedLessonType(suggestion.lessonTypeId);
            const lt = lessonTypes.find(l => l.id === suggestion.lessonTypeId);
            if (lt) setLessonDuration(lt.duration);
          }
        }}
      />
    </div>
  );
}