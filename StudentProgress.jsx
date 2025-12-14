import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  TrendingUp, Calendar, Clock, Target, Award, 
  CheckCircle, BarChart3, Book, Car, Star 
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function StudentProgress() {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const loadStudent = async () => {
      const devUser = sessionStorage.getItem("dev_auth_user");
      const user = devUser ? JSON.parse(devUser) : await base44.auth.me();
      const students = await base44.entities.Student.filter({ email: user.email });
      if (students.length > 0) setStudent(students[0]);
    };
    loadStudent();
  }, []);

  const { data: bookings = [] } = useQuery({
    queryKey: ['studentBookings', student?.id],
    queryFn: async () => {
      if (!student) return [];
      return await base44.entities.Booking.filter({ student_id: student.id }, '-start_datetime');
    },
    enabled: !!student
  });

  const completedLessons = bookings.filter(b => b.status === 'completed');
  const totalHours = completedLessons.reduce((sum, b) => {
    const mins = differenceInMinutes(new Date(b.end_datetime), new Date(b.start_datetime));
    return sum + (mins > 0 ? mins / 60 : 1);
  }, 0);

  const requiredHours = student?.required_hours || 40;
  const progressPercentage = Math.min(100, Math.round((totalHours / requiredHours) * 100));

  const skills = [
    { name: "Parking", score: 85 },
    { name: "Highway Driving", score: 70 },
    { name: "City Navigation", score: 90 },
    { name: "Traffic Rules", score: 95 },
    { name: "Lane Changes", score: 75 },
    { name: "Roundabouts", score: 60 }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-600 mt-1">Track your journey to getting licensed</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Overall Progress</h2>
            <p className="text-white/80">You're {progressPercentage}% of the way there!</p>
          </div>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-white rounded-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{Math.round(totalHours)}</p>
            <p className="text-white/80 text-sm">Hours completed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{completedLessons.length}</p>
            <p className="text-white/80 text-sm">Lessons done</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{Math.max(0, requiredHours - Math.round(totalHours))}</p>
            <p className="text-white/80 text-sm">Hours remaining</p>
          </div>
        </div>
      </div>

      {/* Skills Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#3b82c4]" />
          Skill Breakdown
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {skills.map((skill, idx) => (
            <div key={skill.name}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{skill.name}</span>
                <span className="text-sm font-bold text-gray-900">{skill.score}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.score}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full rounded-full ${
                    skill.score >= 80 ? 'bg-[#81da5a]' :
                    skill.score >= 60 ? 'bg-[#e7d356]' :
                    'bg-[#e44138]'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { 
            name: "Theory Test", 
            completed: student?.theory_exam_passed,
            icon: Book,
            color: "from-[#3b82c4] to-[#2563a3]"
          },
          { 
            name: "Required Hours", 
            completed: totalHours >= requiredHours,
            icon: Clock,
            color: "from-[#81da5a] to-[#5cb83a]"
          },
          { 
            name: "Practical Test", 
            completed: student?.practical_exam_passed,
            icon: Car,
            color: "from-[#e7d356] to-[#d4bf2e]"
          }
        ].map((milestone, idx) => (
          <motion.div
            key={milestone.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`rounded-2xl p-6 shadow-sm border-2 ${
              milestone.completed ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className={`w-16 h-16 bg-gradient-to-br ${milestone.color} rounded-2xl flex items-center justify-center mb-4 ${
              milestone.completed ? 'shadow-lg' : 'grayscale opacity-50'
            }`}>
              <milestone.icon className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{milestone.name}</h3>
            
            {milestone.completed ? (
              <div className="flex items-center gap-2 text-[#5cb83a]">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Completed</span>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Not completed yet</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}