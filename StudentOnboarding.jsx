import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  GraduationCap,
  Car,
  UserCheck,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Star,
  Award,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Target,
  Zap,
  Heart,
  ThumbsUp,
  Gift,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { format, addDays, parseISO } from "date-fns";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/d20e7216b_ChatGPTImageNov21202504_32_39PM.png";

const LICENSE_CATEGORIES = [
  {
    value: "B",
    label: "Category B - Car",
    desc: "Standard passenger vehicle up to 3,500kg",
    icon: Car,
    popular: true,
  },
  {
    value: "A",
    label: "Category A - Motorcycle",
    desc: "Two-wheeled motor vehicles",
    icon: Zap,
    popular: false,
  },
  {
    value: "A1",
    label: "Category A1 - Light Motorcycle",
    desc: "Motorcycles up to 125cc",
    icon: Zap,
    popular: false,
  },
  {
    value: "A2",
    label: "Category A2 - Medium Motorcycle",
    desc: "Motorcycles up to 35kW",
    icon: Zap,
    popular: false,
  },
  {
    value: "C",
    label: "Category C - Truck",
    desc: "Heavy goods vehicles over 3,500kg",
    icon: Car,
    popular: false,
  },
  {
    value: "D",
    label: "Category D - Bus",
    desc: "Passenger transport vehicles",
    icon: Car,
    popular: false,
  },
  {
    value: "BE",
    label: "Category BE - Car + Trailer",
    desc: "Category B with trailer over 750kg",
    icon: Car,
    popular: false,
  },
];

const TRANSMISSION_TYPES = [
  {
    value: "manual",
    label: "Manual",
    desc: "Traditional stick shift with clutch pedal",
    icon: "🔧",
    benefits: ["More control", "Better fuel efficiency", "Drives all vehicles"],
  },
  {
    value: "automatic",
    label: "Automatic",
    desc: "No clutch required, easier to learn",
    icon: "⚡",
    benefits: ["Easier to learn", "Less stressful", "Great for city driving"],
  },
];

const PREFERRED_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const PREFERRED_TIMES = [
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12pm-5pm)" },
  { value: "evening", label: "Evening (5pm-8pm)" },
];

const HEAR_ABOUT_OPTIONS = [
  { value: "google", label: "Google Search" },
  { value: "social_media", label: "Social Media" },
  { value: "friend", label: "Friend/Family Referral" },
  { value: "advertisement", label: "Advertisement" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

const ProgressIndicator = React.memo(({ steps, currentStep, completedSteps }) => (
  <div className="flex items-center justify-between mb-8">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        <div className="flex flex-col items-center">
          <motion.div
            initial={false}
            animate={{
              scale: index === currentStep ? 1.1 : 1,
              backgroundColor:
                index === currentStep
                  ? "#4F46E5"
                  : completedSteps.includes(index)
                  ? "#10B981"
                  : "#E5E7EB",
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
              index === currentStep
                ? "text-white shadow-lg shadow-indigo-500/30"
                : completedSteps.includes(index)
                ? "text-white"
                : "text-zinc-400"
            }`}
          >
            {completedSteps.includes(index) ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <step.icon className="w-6 h-6" />
            )}
          </motion.div>
          <p
            className={`text-xs mt-2 font-medium hidden md:block ${
              index === currentStep
                ? "text-indigo-600"
                : completedSteps.includes(index)
                ? "text-emerald-600"
                : "text-zinc-400"
            }`}
          >
            {step.title}
          </p>
        </div>
        {index < steps.length - 1 && (
          <div
            className={`h-0.5 flex-1 mx-2 transition-colors ${
              completedSteps.includes(index) ? "bg-emerald-300" : "bg-zinc-200"
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
));

ProgressIndicator.displayName = "ProgressIndicator";

const SelectionCard = React.memo(({ selected, onClick, children, badge }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
      selected
        ? "border-indigo-500 bg-indigo-50 shadow-md"
        : "border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50"
    }`}
  >
    {badge && (
      <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-semibold rounded-full">
        {badge}
      </span>
    )}
    <div className="flex items-start gap-3">
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          selected ? "border-indigo-600 bg-indigo-600" : "border-zinc-300"
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  </button>
));

SelectionCard.displayName = "SelectionCard";

const InstructorCard = React.memo(({ instructor, selected, onClick }) => (
  <SelectionCard selected={selected} onClick={onClick}>
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
        {instructor.photo_url ? (
          <img
            src={instructor.photo_url}
            alt={instructor.full_name}
            className="w-full h-full object-cover"
          />
        ) : (
          instructor.full_name?.charAt(0)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-zinc-900">{instructor.full_name}</h4>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {instructor.years_experience && (
            <span>{instructor.years_experience} years exp.</span>
          )}
          {instructor.average_rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {instructor.average_rating.toFixed(1)}
            </span>
          )}
        </div>
        {instructor.specializations && instructor.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {instructor.specializations.slice(0, 3).map((spec) => (
              <span
                key={spec}
                className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-full"
              >
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </SelectionCard>
));

InstructorCard.displayName = "InstructorCard";

const PackageCard = React.memo(({ pkg, selected, onClick }) => (
  <SelectionCard selected={selected} onClick={onClick} badge={pkg.is_popular ? "Popular" : undefined}>
    <div>
      <h4 className="font-semibold text-zinc-900 text-lg">{pkg.name}</h4>
      <p className="text-sm text-zinc-500 mt-1">{pkg.description}</p>
      <div className="flex items-baseline gap-1 mt-3">
        <span className="text-2xl font-bold text-indigo-600">€{pkg.price}</span>
        <span className="text-sm text-zinc-500">
          / {pkg.lessons_included} lessons
        </span>
      </div>
      {pkg.features && pkg.features.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-zinc-600">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      )}
      {pkg.validity_days && (
        <p className="text-xs text-zinc-400 mt-2">
          Valid for {pkg.validity_days} days from purchase
        </p>
      )}
    </div>
  </SelectionCard>
));

PackageCard.displayName = "PackageCard";

const FormInput = React.memo(
  ({ label, type = "text", value, onChange, placeholder, required, icon, error, helpText }) => (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${
            icon ? "pl-10" : ""
          } ${
            error
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-zinc-200 focus:ring-indigo-500 focus:border-indigo-500"
          }`}
          placeholder={placeholder}
          required={required}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {helpText && !error && <p className="text-xs text-zinc-500 mt-1">{helpText}</p>}
    </div>
  )
);

FormInput.displayName = "FormInput";

const CheckboxGroup = React.memo(({ label, options, selected, onChange }) => {
  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
              selected.includes(option.value)
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});

CheckboxGroup.displayName = "CheckboxGroup";

const ReviewSection = React.memo(({ title, children }) => (
  <div className="rounded-xl bg-zinc-50 p-4">
    <h4 className="text-sm font-medium text-zinc-500 mb-2">{title}</h4>
    {children}
  </div>
));

ReviewSection.displayName = "ReviewSection";

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    city: "",
    postal_code: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    license_category: "B",
    preferred_transmission: "manual",
    instructor_id: "auto",
    school_id: "",
    package_id: "",
    preferred_days: [],
    preferred_times: [],
    hear_about_us: "",
    special_requirements: "",
    accept_terms: false,
    accept_privacy: false,
    accept_marketing: false,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.School.list(),
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors", formData.school_id],
    queryFn: () => base44.entities.Instructor.list(),
    enabled: true,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: () => base44.entities.Package.list(),
  });

  const availableInstructors = useMemo(
    () =>
      instructors.filter(
        (i) =>
          (!formData.school_id || i.school_id === formData.school_id) &&
          i.is_active
      ),
    [instructors, formData.school_id]
  );

  const availablePackages = useMemo(
    () => packages.filter((p) => !p.category || p.category === formData.license_category),
    [packages, formData.license_category]
  );

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === formData.package_id),
    [packages, formData.package_id]
  );

  const selectedInstructor = useMemo(
    () => instructors.find((i) => i.id === formData.instructor_id),
    [instructors, formData.instructor_id]
  );

  const createStudentMutation = useMutation({
    mutationFn: async (studentData) => {
      const schoolId = formData.school_id || schools[0]?.id;

      const student = await base44.entities.Student.create({
        full_name: studentData.full_name,
        email: studentData.email,
        phone: studentData.phone,
        date_of_birth: studentData.date_of_birth,
        address: studentData.address,
        city: studentData.city,
        postal_code: studentData.postal_code,
        emergency_contact_name: studentData.emergency_contact_name,
        emergency_contact_phone: studentData.emergency_contact_phone,
        license_category: studentData.license_category,
        preferred_transmission: studentData.preferred_transmission,
        school_id: schoolId,
        is_active: true,
        total_hours_completed: 0,
        total_lessons_completed: 0,
        progress_percentage: 0,
        preferred_days: studentData.preferred_days,
        preferred_times: studentData.preferred_times,
        hear_about_us: studentData.hear_about_us,
        special_requirements: studentData.special_requirements,
        accept_marketing: studentData.accept_marketing,
      });

      let assignedInstructor = null;
      if (formData.instructor_id === "auto") {
        const matchingInstructors = availableInstructors.filter(
          (i) =>
            i.specializations?.includes(formData.preferred_transmission) ||
            i.specializations?.includes(formData.license_category)
        );
        assignedInstructor =
          matchingInstructors.sort(
            (a, b) => (b.average_rating || 0) - (a.average_rating || 0)
          )[0] || availableInstructors[0];
      } else {
        assignedInstructor = instructors.find((i) => i.id === formData.instructor_id);
      }

      if (assignedInstructor) {
        await base44.entities.Student.update(student.id, {
          instructor_id: assignedInstructor.id,
        });
      }

      const lineItems = [];
      let subtotal = 0;

      lineItems.push({
        description: "Registration Fee",
        quantity: 1,
        unit_price: 50,
      });
      subtotal += 50;

      if (selectedPackage) {
        lineItems.push({
          description: `${selectedPackage.name} (${selectedPackage.lessons_included} lessons)`,
          quantity: 1,
          unit_price: selectedPackage.price,
        });
        subtotal += selectedPackage.price;
      } else {
        lineItems.push({
          description: "First Lesson - Initial Assessment",
          quantity: 1,
          unit_price: 75,
        });
        subtotal += 75;
      }

      const taxRate = 0.2;
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      const invoice = await base44.entities.Invoice.create({
        school_id: schoolId,
        student_id: student.id,
        instructor_id: assignedInstructor?.id,
        invoice_number: `REG-${Date.now()}`,
        issue_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        line_items: lineItems,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: "sent",
        notes:
          "Welcome to our driving school! This invoice covers your registration fee and initial package.",
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: student.email,
          subject: "🎉 Welcome to Your Driving Journey!",
          body: `Dear ${student.full_name},

Welcome to our driving school! We're thrilled to have you join us on your journey to becoming a confident driver.

📋 YOUR REGISTRATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- License Category: ${formData.license_category}
- Transmission: ${formData.preferred_transmission}
${assignedInstructor ? `• Assigned Instructor: ${assignedInstructor.full_name}` : ""}
${selectedPackage ? `• Package: ${selectedPackage.name}` : ""}

💰 INVOICE #${invoice.invoice_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${lineItems.map((item) => `• ${item.description}: €${item.unit_price.toFixed(2)}`).join("\n")}
- Tax (20%): €${taxAmount.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL DUE: €${totalAmount.toFixed(2)}
Due Date: ${format(addDays(new Date(), 7), "MMMM d, yyyy")}

📱 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review and pay your invoice
2. We'll contact you within 24 hours to schedule your first lesson
3. Bring a valid ID to your first session
4. Download our app to manage your bookings

If you have any questions, don't hesitate to reach out!

Best regards,
Your Driving School Team

---
This is an automated email. Please do not reply directly.`,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      return { student, invoice, instructor: assignedInstructor };
    },
    onSuccess: () => {
      toast.success("Registration complete! Check your email for details.");
      setTimeout(() => {
        navigate(createPageUrl("Landing"));
      }, 3000);
    },
    onError: (error) => {
      toast.error("Registration failed. Please try again.");
      console.error(error);
    },
  });

  const steps = [
    {
      id: 0,
      title: "Personal Info",
      subtitle: "Tell us about yourself",
      icon: User,
      fields: ["full_name", "email", "phone", "date_of_birth"],
    },
    {
      id: 1,
      title: "Contact Details",
      subtitle: "Where can we reach you",
      icon: MapPin,
      fields: ["address", "city", "postal_code", "emergency_contact_name", "emergency_contact_phone"],
    },
    {
      id: 2,
      title: "License Type",
      subtitle: "Choose your license category",
      icon: GraduationCap,
      fields: ["license_category", "preferred_transmission"],
    },
    {
      id: 3,
      title: "Preferences",
      subtitle: "Customize your learning",
      icon: Calendar,
      fields: ["preferred_days", "preferred_times"],
    },
    {
      id: 4,
      title: "Instructor",
      subtitle: "Choose your instructor",
      icon: UserCheck,
      fields: ["instructor_id"],
    },
    {
      id: 5,
      title: "Package",
      subtitle: "Select a learning package",
      icon: Gift,
      fields: ["package_id"],
    },
    {
      id: 6,
      title: "Review & Pay",
      subtitle: "Confirm your registration",
      icon: CreditCard,
      fields: ["accept_terms", "accept_privacy"],
    },
  ];

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[\d\s-]{8,}$/;
    return phoneRegex.test(phone);
  };

  const validateStep = useCallback(() => {
    const currentFields = steps[currentStep].fields;
    const newErrors = {};

    for (const field of currentFields) {
      const value = formData[field];

      if (field === "full_name" && (!value || (typeof value === "string" && value.trim() === ""))) {
        newErrors[field] = "Full name is required";
      }

      if (field === "email") {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          newErrors[field] = "Email is required";
        } else if (typeof value === "string" && !validateEmail(value)) {
          newErrors[field] = "Please enter a valid email address";
        }
      }

      if (field === "phone") {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          newErrors[field] = "Phone number is required";
        } else if (typeof value === "string" && !validatePhone(value)) {
          newErrors[field] = "Please enter a valid phone number";
        }
      }

      if (field === "date_of_birth") {
        if (!value) {
          newErrors[field] = "Date of birth is required";
        } else if (typeof value === "string") {
          const age =
            (new Date().getTime() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (age < 16) {
            newErrors[field] = "You must be at least 16 years old";
          }
        }
      }

      if (field === "accept_terms" && !value) {
        newErrors[field] = "You must accept the terms and conditions";
      }

      if (field === "accept_privacy" && !value) {
        newErrors[field] = "You must accept the privacy policy";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill in all required fields correctly");
      return false;
    }

    return true;
  }, [currentStep, formData, steps]);

  const handleNext = useCallback(() => {
    if (validateStep()) {
      if (currentStep === 0 && !formData.school_id && schools.length > 0) {
        updateFormData("school_id", schools[0].id);
      }
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  }, [validateStep, currentStep, formData.school_id, schools, steps.length, updateFormData]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(() => {
    if (validateStep()) {
      createStudentMutation.mutate(formData);
    }
  }, [validateStep, createStudentMutation, formData]);

  const calculateTotal = useMemo(() => {
    let subtotal = 50;
    if (selectedPackage) {
      subtotal += selectedPackage.price;
    } else {
      subtotal += 75;
    }
    const tax = subtotal * 0.2;
    return { subtotal, tax, total: subtotal + tax };
  }, [selectedPackage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">Welcome to</h1>
            <img src={LOGO_URL} alt="Logo" className="h-24 md:h-32 object-contain" />
          </div>
          <p className="text-zinc-600">Let's get you started on your driving journey</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-6 md:p-8"
        >
          <ProgressIndicator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">{steps[currentStep].title}</h2>
            <p className="text-zinc-500">{steps[currentStep].subtitle}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-[400px]"
            >
              {currentStep === 0 && (
                <div className="space-y-5">
                  <FormInput
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(v) => updateFormData("full_name", v)}
                    placeholder="John Doe"
                    required
                    icon={<User className="w-4 h-4" />}
                    error={errors.full_name}
                  />
                  <FormInput
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(v) => updateFormData("email", v)}
                    placeholder="john@example.com"
                    required
                    icon={<Mail className="w-4 h-4" />}
                    error={errors.email}
                  />
                  <FormInput
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={(v) => updateFormData("phone", v)}
                    placeholder="+44 123 456 7890"
                    required
                    icon={<Phone className="w-4 h-4" />}
                    error={errors.phone}
                  />
                  <FormInput
                    label="Date of Birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(v) => updateFormData("date_of_birth", v)}
                    required
                    icon={<Calendar className="w-4 h-4" />}
                    error={errors.date_of_birth}
                    helpText="You must be at least 16 years old to register"
                  />
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-5">
                  <FormInput
                    label="Address"
                    value={formData.address}
                    onChange={(v) => updateFormData("address", v)}
                    placeholder="123 Main Street"
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="City"
                      value={formData.city}
                      onChange={(v) => updateFormData("city", v)}
                      placeholder="London"
                    />
                    <FormInput
                      label="Postal Code"
                      value={formData.postal_code}
                      onChange={(v) => updateFormData("postal_code", v)}
                      placeholder="SW1A 1AA"
                    />
                  </div>

                  <div className="pt-4 border-t border-zinc-200">
                    <h4 className="font-medium text-zinc-900 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-500" />
                      Emergency Contact
                    </h4>
                    <div className="space-y-4">
                      <FormInput
                        label="Contact Name"
                        value={formData.emergency_contact_name}
                        onChange={(v) => updateFormData("emergency_contact_name", v)}
                        placeholder="Jane Doe"
                        icon={<User className="w-4 h-4" />}
                      />
                      <FormInput
                        label="Contact Phone"
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(v) => updateFormData("emergency_contact_phone", v)}
                        placeholder="+44 123 456 7890"
                        icon={<Phone className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-zinc-900 mb-3">License Category</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {LICENSE_CATEGORIES.map((cat) => (
                        <SelectionCard
                          key={cat.value}
                          selected={formData.license_category === cat.value}
                          onClick={() => updateFormData("license_category", cat.value)}
                          badge={cat.popular ? "Most Popular" : undefined}
                        >
                          <div>
                            <h4 className="font-semibold text-zinc-900">{cat.label}</h4>
                            <p className="text-sm text-zinc-500 mt-0.5">{cat.desc}</p>
                          </div>
                        </SelectionCard>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-zinc-900 mb-3">Transmission Type</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TRANSMISSION_TYPES.map((trans) => (
                        <SelectionCard
                          key={trans.value}
                          selected={formData.preferred_transmission === trans.value}
                          onClick={() => updateFormData("preferred_transmission", trans.value)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{trans.icon}</span>
                              <h4 className="font-semibold text-zinc-900">{trans.label}</h4>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1">{trans.desc}</p>
                            <ul className="mt-2 space-y-1">
                              {trans.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-xs text-zinc-600">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </SelectionCard>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <CheckboxGroup
                    label="Preferred Days"
                    options={PREFERRED_DAYS}
                    selected={formData.preferred_days}
                    onChange={(v) => updateFormData("preferred_days", v)}
                  />

                  <CheckboxGroup
                    label="Preferred Times"
                    options={PREFERRED_TIMES}
                    selected={formData.preferred_times}
                    onChange={(v) => updateFormData("preferred_times", v)}
                  />

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      How did you hear about us?
                    </label>
                    <select
                      value={formData.hear_about_us}
                      onChange={(e) => updateFormData("hear_about_us", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select an option</option>
                      {HEAR_ABOUT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Special Requirements or Notes
                    </label>
                    <textarea
                      value={formData.special_requirements}
                      onChange={(e) => updateFormData("special_requirements", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Any specific needs, medical conditions, or requests..."
                    />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <SelectionCard
                    selected={formData.instructor_id === "auto"}
                    onClick={() => updateFormData("instructor_id", "auto")}
                    badge="Recommended"
                  >
                    <div>
                      <h4 className="font-semibold text-zinc-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Auto-Assign Best Match
                      </h4>
                      <p className="text-sm text-zinc-500 mt-0.5">
                        We'll match you with the best available instructor based on your preferences
                      </p>
                    </div>
                  </SelectionCard>

                  {availableInstructors.length > 0 && (
                    <div className="pt-4 border-t border-zinc-200">
                      <h4 className="text-sm font-medium text-zinc-700 mb-3">
                        Or choose a specific instructor
                      </h4>
                      <div className="space-y-3">
                        {availableInstructors.map((instructor) => (
                          <InstructorCard
                            key={instructor.id}
                            instructor={instructor}
                            selected={formData.instructor_id === instructor.id}
                            onClick={() => updateFormData("instructor_id", instructor.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  {availablePackages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availablePackages.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          pkg={pkg}
                          selected={formData.package_id === pkg.id}
                          onClick={() => updateFormData("package_id", pkg.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Gift className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                      <p className="text-zinc-500">No packages available at the moment</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        You can choose a package later after registration
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Package Selection is Optional</p>
                        <p className="text-sm text-blue-700 mt-0.5">
                          You can skip this step and select a package later. A registration fee and
                          first lesson will still be included.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReviewSection title="Personal Information">
                      <p className="font-medium text-zinc-900">{formData.full_name}</p>
                      <p className="text-sm text-zinc-600">{formData.email}</p>
                      <p className="text-sm text-zinc-600">{formData.phone}</p>
                      {formData.date_of_birth && (
                        <p className="text-sm text-zinc-600">
                          Born: {format(new Date(formData.date_of_birth), "MMMM d, yyyy")}
                        </p>
                      )}
                    </ReviewSection>

                    <ReviewSection title="Training Details">
                      <p className="font-medium text-zinc-900">
                        Category {formData.license_category} - {formData.preferred_transmission}
                      </p>
                      {formData.instructor_id === "auto" ? (
                        <p className="text-sm text-zinc-600">Instructor: Auto-Assigned</p>
                      ) : selectedInstructor ? (
                        <p className="text-sm text-zinc-600">
                          Instructor: {selectedInstructor.full_name}
                        </p>
                      ) : null}
                      {selectedPackage && (
                        <p className="text-sm text-zinc-600">Package: {selectedPackage.name}</p>
                      )}
                    </ReviewSection>
                  </div>

                  <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-6">
                    <h4 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      Registration Invoice
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Registration Fee</span>
                        <span className="font-medium">€50.00</span>
                      </div>
                      {selectedPackage ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">
                            {selectedPackage.name} ({selectedPackage.lessons_included} lessons)
                          </span>
                          <span className="font-medium">€{selectedPackage.price.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">First Lesson (Initial Assessment)</span>
                          <span className="font-medium">€75.00</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Tax (20%)</span>
                        <span className="font-medium">€{calculateTotal.tax.toFixed(2)}</span>
                      </div>
                      <div className="border-t-2 border-indigo-200 pt-2 mt-2 flex justify-between">
                        <span className="font-bold text-zinc-900">Total Due</span>
                        <span className="font-bold text-indigo-600 text-xl">
                          €{calculateTotal.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.accept_terms}
                        onChange={(e) => updateFormData("accept_terms", e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <span className="text-sm text-zinc-700">
                        I accept the{" "}
                        <a href="#" className="text-indigo-600 hover:underline">
                          Terms and Conditions
                        </a>{" "}
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    {errors.accept_terms && (
                      <p className="text-xs text-red-500 ml-8">{errors.accept_terms}</p>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.accept_privacy}
                        onChange={(e) => updateFormData("accept_privacy", e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <span className="text-sm text-zinc-700">
                        I accept the{" "}
                        <a href="#" className="text-indigo-600 hover:underline">
                          Privacy Policy
                        </a>{" "}
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    {errors.accept_privacy && (
                      <p className="text-xs text-red-500 ml-8">{errors.accept_privacy}</p>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.accept_marketing}
                        onChange={(e) => updateFormData("accept_marketing", e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <span className="text-sm text-zinc-700">
                        I would like to receive marketing communications and special offers
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <Mail className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        Confirmation will be sent via email
                      </p>
                      <p className="text-sm text-emerald-700 mt-0.5">
                        You'll receive your invoice, welcome pack, and booking instructions at{" "}
                        {formData.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-200">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-zinc-200 font-semibold text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createStudentMutation.isPending}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStudentMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <a href="/login" className="text-indigo-600 hover:underline font-medium">
              Sign in here
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}