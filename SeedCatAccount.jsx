import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * Development/Admin tool to seed the "Cat" demo account into the database.
 * This creates a real User + Student record that can be used for demos and testing.
 * 
 * Access: Only for admins or in development mode.
 */
export default function SeedCatAccount() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const seedCatAccount = async () => {
    setLoading(true);
    setResult(null);

    const log = [];
    const errors = [];

    try {
      log.push("Starting Cat account seed...");

      // Check if school exists
      let school;
      try {
        const schools = await base44.entities.School.list();
        if (schools && schools.length > 0) {
          school = schools[0];
          log.push(`Using existing school: ${school.name} (${school.id})`);
        } else {
          log.push("No schools found - Cat account needs a school to be created first");
          errors.push("Please create at least one school before seeding Cat account");
        }
      } catch (err) {
        errors.push(`Failed to fetch schools: ${err.message}`);
      }

      if (!school) {
        setResult({ success: false, log, errors });
        setLoading(false);
        toast.error("Seed failed - no school available");
        return;
      }

      // Check if Cat student already exists
      const catEmail = "cat@me.com";
      let existingStudent;
      try {
        const students = await base44.entities.Student.filter({ email: catEmail });
        existingStudent = students && students.length > 0 ? students[0] : null;
        
        if (existingStudent) {
          log.push(`Cat student already exists: ${existingStudent.id}`);
        }
      } catch (err) {
        log.push(`Could not check for existing student: ${err.message}`);
      }

      // Create or update Cat student
      let student;
      if (existingStudent) {
        student = existingStudent;
        log.push(`Using existing Cat student: ${student.id}`);
      } else {
        try {
          student = await base44.entities.Student.create({
            full_name: "Cat Student",
            email: catEmail,
            phone: "+33 6 12 34 56 78",
            school_id: school.id,
            license_category: "B",
            required_hours: 40,
            total_lessons_completed: 12,
            total_hours_completed: 18,
            theory_exam_passed: true,
            is_active: true,
          });
          log.push(`Created Cat student: ${student.id}`);
        } catch (err) {
          errors.push(`Failed to create Cat student: ${err.message}`);
        }
      }

      if (!student) {
        setResult({ success: false, log, errors });
        setLoading(false);
        return;
      }

      // Get instructors and vehicles for bookings
      let instructors = [];
      let vehicles = [];
      try {
        instructors = await base44.entities.Instructor.list();
        vehicles = await base44.entities.Vehicle.list();
        log.push(`Found ${instructors.length} instructors and ${vehicles.length} vehicles`);
      } catch (err) {
        log.push(`Could not fetch instructors/vehicles: ${err.message}`);
      }

      const instructor = instructors[0];
      const vehicle = vehicles[0];

      // Create sample bookings (only if instructor and vehicle exist)
      if (instructor && vehicle) {
        try {
          const existingBookings = await base44.entities.Booking.filter({ student_id: student.id });
          if (existingBookings.length === 0) {
            const now = new Date();
            const bookingsToCreate = [
              {
                school_id: school.id,
                student_id: student.id,
                instructor_id: instructor.id,
                vehicle_id: vehicle.id,
                start_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                end_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
                status: "confirmed",
                price: 45,
                lesson_type: "standard",
                pickup_location: "Home",
              },
              {
                school_id: school.id,
                student_id: student.id,
                instructor_id: instructor.id,
                vehicle_id: vehicle.id,
                start_datetime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                end_datetime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
                status: "completed",
                price: 60,
                lesson_type: "highway",
                pickup_location: "School",
              },
            ];

            for (const bookingData of bookingsToCreate) {
              await base44.entities.Booking.create(bookingData);
            }
            log.push(`Created ${bookingsToCreate.length} sample bookings`);
          } else {
            log.push(`Bookings already exist for Cat student (${existingBookings.length})`);
          }
        } catch (err) {
          log.push(`Could not create sample bookings: ${err.message}`);
        }
      }

      // Create sample package
      try {
        const existingPackages = await base44.entities.Package.filter({ student_id: student.id });
        if (existingPackages.length === 0) {
          await base44.entities.Package.create({
            school_id: school.id,
            student_id: student.id,
            name: "Starter Package",
            number_of_lessons: 20,
            duration_per_lesson: 60,
            total_price: 800,
            category: "B",
            lessons_remaining: 8,
            is_active: true,
          });
          log.push("Created sample package with 8 credits remaining");
        } else {
          log.push(`Package already exists for Cat student`);
        }
      } catch (err) {
        log.push(`Could not create sample package: ${err.message}`);
      }

      // Create sample invoice
      try {
        const existingInvoices = await base44.entities.Invoice.filter({ student_id: student.id });
        if (existingInvoices.length === 0) {
          await base44.entities.Invoice.create({
            school_id: school.id,
            student_id: student.id,
            invoice_number: "INV-2025-001",
            issue_date: new Date().toISOString().split("T")[0],
            total_amount: 800,
            amount_paid: 800,
            status: "paid",
          });
          log.push("Created sample paid invoice");
        } else {
          log.push(`Invoice already exists for Cat student`);
        }
      } catch (err) {
        log.push(`Could not create sample invoice: ${err.message}`);
      }

      // Note about user authentication
      log.push("Note: User authentication must be set up separately via Base44's user management");
      log.push(`Ensure a user with email ${catEmail} exists and can log in`);
      log.push("You may need to invite this user or create them through the admin panel");

      log.push("Cat account seed completed successfully!");
      log.push("The Cat account is now ready to use with sample data");
      setResult({ success: true, log, errors, studentId: student.id });
      toast.success("Cat account seeded successfully with demo data");
    } catch (err) {
      errors.push(`Unexpected error: ${err.message}`);
      setResult({ success: false, log, errors });
      toast.error("Seed failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#eefbe7] rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-[#5cb83a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Seed Cat Account</h1>
              <p className="text-sm text-zinc-600">Create a live demo account in the database</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This seeds a Student record with email <code className="bg-yellow-100 px-1 rounded">cat@me.com</code></li>
                  <li>You must separately create/invite this user in Base44's auth system</li>
                  <li>The user must verify their email (if required) before logging in</li>
                  <li>At least one School must exist in the database</li>
                  <li>This operation is idempotent - safe to run multiple times</li>
                </ul>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={seedCatAccount}
            disabled={loading}
            className="w-full py-4 bg-[#5cb83a] hover:bg-[#4a9c2e] text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Seed Cat Account
              </>
            )}
          </motion.button>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <div className={`p-4 rounded-xl border ${
                result.success 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.success ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-900">Seed Successful</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-900">Seed Failed</span>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  {result.log.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-zinc-700 mb-2">Log:</p>
                      <div className="bg-white rounded-lg p-3 text-xs font-mono space-y-1">
                        {result.log.map((line, i) => (
                          <div key={i} className="text-zinc-600">{line}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-red-700 mb-2">Errors:</p>
                      <div className="bg-red-100 rounded-lg p-3 text-xs space-y-1">
                        {result.errors.map((err, i) => (
                          <div key={i} className="text-red-800">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.studentId && (
                    <div className="pt-3 border-t border-green-200">
                      <p className="text-xs text-green-800">
                        <span className="font-bold">Student ID:</span> {result.studentId}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}