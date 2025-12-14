import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Star, Target, Award, Zap, TrendingUp, CheckCircle, Lock } from "lucide-react";

export default function StudentAchievements() {
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
      return await base44.entities.Booking.filter({ student_id: student.id });
    },
    enabled: !!student
  });

  const achievements = [
    { 
      id: 'first_lesson', 
      name: 'First Lesson', 
      description: 'Complete your first driving lesson',
      icon: CheckCircle,
      color: 'from-[#3b82c4] to-[#2563a3]',
      unlocked: bookings.filter(b => b.status === 'completed').length >= 1
    },
    { 
      id: 'five_lessons', 
      name: '5 Lessons Milestone', 
      description: 'Complete 5 driving lessons',
      icon: Star,
      color: 'from-[#e7d356] to-[#d4bf2e]',
      unlocked: bookings.filter(b => b.status === 'completed').length >= 5
    },
    { 
      id: 'ten_lessons', 
      name: '10 Lessons Milestone', 
      description: 'Complete 10 driving lessons',
      icon: Award,
      color: 'from-[#81da5a] to-[#5cb83a]',
      unlocked: bookings.filter(b => b.status === 'completed').length >= 10
    },
    { 
      id: 'perfect_attendance', 
      name: 'Perfect Attendance', 
      description: 'Complete 5 lessons without canceling',
      icon: Target,
      color: 'from-[#6c376f] to-[#5a2d5d]',
      unlocked: bookings.filter(b => b.status === 'completed').length >= 5 && 
                bookings.filter(b => b.status === 'cancelled').length === 0
    },
    { 
      id: 'early_bird', 
      name: 'Early Bird', 
      description: 'Book 3 lessons in advance',
      icon: Zap,
      color: 'from-[#3b82c4] to-[#a9d5ed]',
      unlocked: bookings.filter(b => b.status === 'confirmed').length >= 3
    },
    { 
      id: 'theory_master', 
      name: 'Theory Master', 
      description: 'Pass the theory test',
      icon: Trophy,
      color: 'from-[#e44138] to-[#c9342c]',
      unlocked: student?.theory_exam_passed || false
    },
    { 
      id: 'road_ready', 
      name: 'Road Ready', 
      description: 'Complete required hours and become test eligible',
      icon: TrendingUp,
      color: 'from-[#81da5a] to-[#5cb83a]',
      unlocked: student?.exam_eligible || false
    },
    { 
      id: 'licensed_driver', 
      name: 'Licensed Driver', 
      description: 'Pass your practical driving test',
      icon: Award,
      color: 'from-[#3b82c4] to-[#2563a3]',
      unlocked: student?.practical_exam_passed || false
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const progressPercentage = (unlockedCount / achievements.length) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Your Achievements</h1>
        <p className="text-slate-600 mt-1">Track your milestones and celebrate your progress</p>
      </div>

      {/* Progress Overview */}
      <div className="bg-gradient-to-br from-[#3b82c4] via-[#2563a3] to-[#1e4f8a] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/80 text-sm mb-1">Overall Progress</p>
            <p className="text-4xl font-bold">{unlockedCount} / {achievements.length}</p>
          </div>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-white rounded-full"
          />
        </div>
        <p className="text-white/80 text-sm mt-3">Keep going! {achievements.length - unlockedCount} more to unlock</p>
      </div>

      {/* Achievements Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement, idx) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`relative rounded-2xl p-6 border-2 transition-all ${
              achievement.unlocked
                ? 'bg-white shadow-premium hover:shadow-premium-lg border-slate-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            {!achievement.unlocked && (
              <div className="absolute top-4 right-4">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
            )}
            
            <div className={`w-16 h-16 bg-gradient-to-br ${achievement.color} rounded-2xl flex items-center justify-center mb-4 ${
              achievement.unlocked ? 'shadow-lg' : 'grayscale'
            }`}>
              <achievement.icon className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">{achievement.name}</h3>
            <p className="text-sm text-slate-600">{achievement.description}</p>

            {achievement.unlocked && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#5cb83a]" />
                  <span className="text-[#5cb83a] font-semibold">Unlocked!</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}