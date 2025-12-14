import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Database, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { addDays, addHours } from "date-fns";

export default function SeedData() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (message, status = "success") => {
    setResults((prev) => [
      ...prev,
      { message, status, timestamp: Date.now() },
    ]);
  };

  const isoDate = (date) => date.toISOString().split("T")[0];

  const seedDatabase = async () => {
    if (loading) return;

    const confirmed = window.confirm(
      "This will create demo schools, instructors, vehicles, students, bookings and invoices in your account.\n\nUse this only in a test or demo workspace.\n\nContinue?"
    );
    if (!confirmed) return;

    setLoading(true);
    setResults([]);

    try {
      addResult("Starting demo data seeding...", "info");

      // 1. Create School
      addResult("Creating school...");
      const school = await base44.entities.School.create({
        name: "Elite Driving Academy",
        description:
          "Premium driving instruction with experienced instructors and modern vehicles",
        address: "123 Main Street",
        city: "Dublin",
        postal_code: "D02 XY45",
        country: "Ireland",
        phone: "+353 1 234 5678",
        email: "info@elitedriving.ie",
        website: "https://elitedriving.ie",
        latitude: 53.3498,
        longitude: -6.2603,
        rating: 4.8,
        total_reviews: 127,
        languages: ["English", "Irish", "Polish", "Spanish"],
        certifications: ["B", "A", "C"],
        is_active: true,
        is_featured: true,
        logo_url:
          "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/3bd2451d4_ChatGPTImageNov18202512_33_54AM-Photoroom.png",
      });
      addResult(`School created: ${school.name}`);

      // 2. Create Instructors
      addResult("Creating instructors...");
      const instructors = await base44.entities.Instructor.bulkCreate([
        {
          full_name: "John Murphy",
          email: "john.murphy@elitedriving.ie",
          phone: "+353 87 123 4567",
          school_id: school.id,
          bio: "Experienced instructor with 15 years teaching safe driving",
          languages: ["English", "Irish"],
          certifications: ["B", "A"],
          years_experience: 15,
          rating: 4.9,
          total_reviews: 89,
          total_lessons: 1240,
          is_active: true,
        },
        {
          full_name: "Sarah O'Brien",
          email: "sarah.obrien@elitedriving.ie",
          phone: "+353 87 234 5678",
          school_id: school.id,
          bio: "Patient and friendly instructor specializing in nervous learners",
          languages: ["English", "Spanish"],
          certifications: ["B"],
          years_experience: 8,
          rating: 4.8,
          total_reviews: 64,
          total_lessons: 780,
          is_active: true,
        },
        {
          full_name: "Michael Chen",
          email: "michael.chen@elitedriving.ie",
          phone: "+353 87 345 6789",
          school_id: school.id,
          bio: "Test preparation specialist with high pass rates",
          languages: ["English", "Mandarin"],
          certifications: ["B", "C"],
          years_experience: 10,
          rating: 4.9,
          total_reviews: 72,
          total_lessons: 920,
          is_active: true,
        },
      ]);
      addResult(`Created ${instructors.length} instructors`);

      // 3. Create Vehicles
      addResult("Creating vehicles...");
      const vehicles = await base44.entities.Vehicle.bulkCreate([
        {
          school_id: school.id,
          make: "Toyota",
          model: "Corolla",
          year: 2022,
          license_plate: "22-D-12345",
          color: "Silver",
          transmission: "manual",
          category: "B",
          is_electric: false,
          has_dual_controls: true,
          mileage: 45000,
          is_available: true,
        },
        {
          school_id: school.id,
          make: "Volkswagen",
          model: "Golf",
          year: 2023,
          license_plate: "23-D-67890",
          color: "Blue",
          transmission: "automatic",
          category: "B",
          is_electric: false,
          has_dual_controls: true,
          mileage: 12000,
          is_available: true,
        },
        {
          school_id: school.id,
          make: "Tesla",
          model: "Model 3",
          year: 2023,
          license_plate: "23-D-11111",
          color: "White",
          transmission: "automatic",
          category: "B",
          is_electric: true,
          has_dual_controls: true,
          mileage: 8000,
          is_available: true,
        },
      ]);
      addResult(`Created ${vehicles.length} vehicles`);

      // 4. Create Service Templates
      addResult("Creating service templates...");
      const serviceTemplates =
        await base44.entities.ServiceTemplate.bulkCreate([
          {
            school_id: school.id,
            name: "Standard Driving Lesson",
            description: "1 hour practical driving lesson",
            duration_minutes: 60,
            buffer_minutes: 15,
            price: 45,
            category: "B",
            transmission_type: "both",
            is_active: true,
            color: "#4F46E5",
          },
          {
            school_id: school.id,
            name: "Highway Driving",
            description: "Motorway and high speed driving practice",
            duration_minutes: 90,
            buffer_minutes: 15,
            price: 65,
            category: "B",
            transmission_type: "both",
            is_active: true,
            color: "#7C3AED",
          },
          {
            school_id: school.id,
            name: "Test Preparation",
            description: "Pre test lesson with mock exam simulation",
            duration_minutes: 120,
            buffer_minutes: 15,
            price: 85,
            category: "B",
            transmission_type: "both",
            is_active: true,
            color: "#10B981",
          },
        ]);
      addResult(`Created ${serviceTemplates.length} service templates`);

      // 5. Create Demo Students
      addResult("Creating demo students...");
      const currentUser = await base44.auth.me().catch(() => null);

      const demoStudents = await base44.entities.Student.bulkCreate([
        {
          full_name: currentUser?.full_name || "Demo Student",
          email: currentUser?.email || "demo.student@example.com",
          phone: "+353 87 999 0001",
          school_id: school.id,
          date_of_birth: "2000-01-15",
          address: "456 Student Road, Dublin",
          license_category: "B",
          theory_exam_passed: true,
          theory_exam_date: addDays(new Date(), -30).toISOString(),
          practical_exam_passed: false,
          practical_exam_date: addDays(new Date(), 14).toISOString(),
          total_lessons_completed: 18,
          total_hours_completed: 18,
          simulator_hours_completed: 2,
          theory_hours_completed: 12,
          required_hours: 40,
          progress_percentage: 45,
          exam_eligible: false,
          preferred_instructor_id: instructors[0].id,
          preferred_transmission: "manual",
          pickup_zone: "Dublin City Centre",
          is_active: true,
        },
        {
          full_name: "Emma Watson",
          email: "emma.watson@example.com",
          phone: "+353 87 999 0002",
          school_id: school.id,
          date_of_birth: "1998-05-20",
          address: "789 Practice Lane, Dublin",
          license_category: "B",
          theory_exam_passed: true,
          theory_exam_date: addDays(new Date(), -45).toISOString(),
          practical_exam_passed: false,
          total_lessons_completed: 35,
          total_hours_completed: 35,
          required_hours: 40,
          progress_percentage: 87,
          exam_eligible: true,
          preferred_instructor_id: instructors[1].id,
          preferred_transmission: "automatic",
          is_active: true,
        },
      ]);
      addResult(`Created ${demoStudents.length} students`);

      // 6. Create Bookings
      addResult("Creating bookings...");
      const now = new Date();
      const bookings = [];

      // Past completed lessons
      for (let i = 0; i < 5; i++) {
        const startDate = addHours(now, -72 - i * 48);
        startDate.setHours(14, 0, 0, 0);
        const endDate = addHours(startDate, 1);

        bookings.push({
          school_id: school.id,
          student_id: demoStudents[0].id,
          instructor_id: instructors[0].id,
          vehicle_id: vehicles[0].id,
          service_template_id: serviceTemplates[0].id,
          start_datetime: startDate.toISOString(),
          end_datetime: endDate.toISOString(),
          pickup_location: "Dublin City Centre",
          status: "completed",
          price: 45,
          payment_status: "paid",
          instructor_notes: `Lesson ${i + 1}: Good progress on city driving${
            i === 4 ? ". Ready for highway practice." : "."
          }`,
          attendance_marked: true,
          buffer_time_minutes: 15,
        });
      }

      // Upcoming lessons
      for (let i = 0; i < 3; i++) {
        const startDate = addHours(now, 24 + i * 48);
        startDate.setHours(10 + i, 0, 0, 0);
        const endDate = addHours(startDate, 1);

        bookings.push({
          school_id: school.id,
          student_id: demoStudents[0].id,
          instructor_id: instructors[i % instructors.length].id,
          vehicle_id: vehicles[i % vehicles.length].id,
          service_template_id: serviceTemplates[0].id,
          start_datetime: startDate.toISOString(),
          end_datetime: endDate.toISOString(),
          pickup_location: "Dublin City Centre",
          status: "confirmed",
          price: 45,
          payment_status: "unpaid",
          buffer_time_minutes: 15,
        });
      }

      const createdBookings = await base44.entities.Booking.bulkCreate(bookings);
      addResult(`Created ${createdBookings.length} bookings`);

      // 7. Create Invoices
      addResult("Creating invoices...");
      const invoices = await base44.entities.Invoice.bulkCreate([
        {
          school_id: school.id,
          student_id: demoStudents[0].id,
          instructor_id: instructors[0].id,
          booking_id: createdBookings[0].id,
          invoice_number: `INV-${Date.now()}-001`,
          issue_date: isoDate(addDays(now, -5)),
          due_date: isoDate(addDays(now, 25)),
          subtotal: 225,
          tax_amount: 45,
          total_amount: 270,
          amount_paid: 0,
          status: "sent",
          line_items: [
            {
              description: "5x Standard Driving Lessons",
              quantity: 5,
              unit_price: 45,
              amount: 225,
            },
          ],
          notes: "Thank you for choosing Elite Driving Academy",
        },
        {
          school_id: school.id,
          student_id: demoStudents[0].id,
          instructor_id: instructors[0].id,
          invoice_number: `INV-${Date.now()}-002`,
          issue_date: isoDate(addDays(now, -35)),
          due_date: isoDate(addDays(now, -5)),
          subtotal: 180,
          tax_amount: 36,
          total_amount: 216,
          amount_paid: 216,
          status: "paid",
          payment_method: "card",
          line_items: [
            {
              description: "4x Standard Driving Lessons",
              quantity: 4,
              unit_price: 45,
              amount: 180,
            },
          ],
        },
      ]);
      addResult(`Created ${invoices.length} invoices`);

      // 8. Create Payments
      addResult("Creating payments...");
      await base44.entities.Payment.create({
        school_id: school.id,
        student_id: demoStudents[0].id,
        amount: 216,
        currency: "EUR",
        payment_method: "card",
        payment_type: "lesson",
        status: "completed",
        payment_date: addDays(now, -35).toISOString(),
        transaction_id: `txn_${Date.now()}_demo`,
      });
      addResult("Created payment records");

      // 9. Create Package
      addResult("Creating package...");
      await base44.entities.Package.create({
        school_id: school.id,
        name: "Essential Driving Package",
        description: "10 driving lessons with theory materials",
        number_of_lessons: 10,
        duration_per_lesson: 60,
        total_price: 400,
        discount_percentage: 11,
        category: "B",
        is_active: true,
        includes_theory: true,
        includes_exam_car: false,
        validity_days: 180,
      });
      addResult("Created package");

      // 10. Create Reviews
      addResult("Creating reviews...");
      await base44.entities.Review.bulkCreate([
        {
          school_id: school.id,
          instructor_id: instructors[0].id,
          student_id: demoStudents[1].id,
          rating: 5,
          comment:
            "John is an excellent instructor. Very patient and explains everything clearly.",
          is_verified: true,
          is_visible: true,
        },
        {
          school_id: school.id,
          instructor_id: instructors[1].id,
          student_id: demoStudents[1].id,
          rating: 5,
          comment:
            "Sarah helped me overcome my nervousness. Highly recommend.",
          is_verified: true,
          is_visible: true,
        },
      ]);
      addResult("Created reviews");

      addResult("Demo data seeded successfully.", "success");
      toast.success("Database seeded with demo data.");
    } catch (error) {
      console.error("Seeding error:", error);
      addResult(
        `Error while seeding: ${error?.message || "Unknown error"}`,
        "error"
      );
      toast.error("Failed to seed database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="neo-surface p-8"
      >
        <div className="text-center mb-8">
          <Database className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Seed demo data
          </h1>
          <p className="text-muted">
            Populate your workspace with realistic demo data for testing and
            product demos.
          </p>
          <p className="mt-2 text-xs text-amber-600">
            Use only in a test or staging environment. This will create real
            records in your database.
          </p>
        </div>

        <div className="mb-6 neo-inset p-4 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">
            This will create:
          </h3>
          <ul className="space-y-1 text-sm text-muted">
            <li>• 1 Elite Driving School</li>
            <li>• 3 instructors with profiles</li>
            <li>• 3 modern vehicles (including Tesla)</li>
            <li>• 3 service templates</li>
            <li>• 2 demo students (including your account if available)</li>
            <li>• 8 bookings (5 completed, 3 upcoming)</li>
            <li>• 2 invoices (1 paid, 1 pending)</li>
            <li>• 1 payment record</li>
            <li>• 1 package deal</li>
            <li>• 2 customer reviews</li>
          </ul>
        </div>

        <button
          onClick={seedDatabase}
          disabled={loading}
          className="neo-button w-full py-4 gradient-primary text-white font-bold text-lg flex items-center justify-center gap-3 mb-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Seeding database...
            </>
          ) : (
            <>
              <Database className="w-6 h-6" />
              Seed demo data
            </>
          )}
        </button>

        {results.length > 0 && (
          <div className="neo-inset p-4 rounded-xl max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">Progress</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {result.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : result.status === "error" ? (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5 animate-spin" />
                  )}
                  <span
                    className={
                      result.status === "error"
                        ? "text-red-700"
                        : "text-gray-700"
                    }
                  >
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
