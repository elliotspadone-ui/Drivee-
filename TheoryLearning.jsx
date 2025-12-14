import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  PlayCircle,
  Clock,
  Brain,
  Video,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  Flame,
  Bookmark,
  Flag,
  Lightbulb,
  GraduationCap,
  Timer,
  Target,
  TrendingUp,
  Volume2,
  Maximize,
  Pause,
  Play,
  RefreshCw,
  Percent,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { celebrate } from "@/components/common/ConfettiCelebration";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORIES = [
  { id: "traffic_signs", name: "Traffic Signs", icon: "🚦", description: "Road signs and signals" },
  { id: "road_rules", name: "Road Rules", icon: "📋", description: "Rules of the road" },
  { id: "safety", name: "Safety", icon: "🛡️", description: "Safe driving practices" },
  { id: "vehicle_handling", name: "Vehicle Handling", icon: "🚗", description: "Vehicle control" },
  { id: "environmental", name: "Environmental", icon: "🌍", description: "Eco-friendly driving" },
  { id: "first_aid", name: "First Aid", icon: "🚑", description: "Emergency procedures" },
  { id: "technical", name: "Technical", icon: "🔧", description: "Vehicle mechanics" },
  { id: "regulations", name: "Regulations", icon: "⚖️", description: "Legal requirements" },
];

// Discount code for Pass & Save feature
const DISCOUNT_CODE = "THEORY10";

const MOCK_EXAM_TIME_LIMIT = 3000;
const MOCK_EXAM_QUESTION_COUNT = 50;
const PRACTICE_QUESTION_COUNT = 20;
const ADAPTIVE_QUESTION_COUNT = 40;
const PASSING_SCORE = 80;

class AdaptiveTestEngine {
  constructor(questions, attempts) {
    this.questions = questions;
    this.attempts = attempts;
    this.weakCategories = new Map();
    this.questionPerformance = new Map();
    this.analyzePerformance();
  }

  analyzePerformance() {
    const categoryStats = new Map();

    this.attempts.forEach((attempt) => {
      if (attempt.answers) {
        Object.entries(attempt.answers).forEach(([questionId, answer]) => {
          const question = this.questions.find((q) => q.id === questionId);
          if (question) {
            const stats = categoryStats.get(question.category) || { total: 0, correct: 0 };
            stats.total++;
            if (answer.correct) stats.correct++;
            categoryStats.set(question.category, stats);

            const qPerf = this.questionPerformance.get(questionId) || {
              attempts: 0,
              correct: 0,
            };
            qPerf.attempts++;
            if (answer.correct) qPerf.correct++;
            this.questionPerformance.set(questionId, qPerf);
          }
        });
      }
    });

    categoryStats.forEach((stats, category) => {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0.5;
      this.weakCategories.set(category, 1 - accuracy);
    });
  }

  selectAdaptiveQuestions(count) {
    const selectedQuestions = [];
    const availableQuestions = [...this.questions.filter((q) => q.is_active)];

    const sortedCategories = Array.from(this.weakCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);

    const weakCategoryCount = Math.floor(count * 0.6);
    const randomCount = count - weakCategoryCount;

    for (const category of sortedCategories) {
      if (selectedQuestions.length >= weakCategoryCount) break;

      const categoryQuestions = availableQuestions
        .filter((q) => q.category === category)
        .sort((a, b) => {
          const perfA = this.questionPerformance.get(a.id);
          const perfB = this.questionPerformance.get(b.id);
          const accuracyA = perfA ? perfA.correct / perfA.attempts : 0.5;
          const accuracyB = perfB ? perfB.correct / perfB.attempts : 0.5;
          return accuracyA - accuracyB;
        });

      for (const question of categoryQuestions) {
        if (selectedQuestions.length >= weakCategoryCount) break;
        if (!selectedQuestions.includes(question)) {
          selectedQuestions.push(question);
          const idx = availableQuestions.indexOf(question);
          if (idx > -1) availableQuestions.splice(idx, 1);
        }
      }
    }

    const shuffledRemaining = availableQuestions.sort(() => Math.random() - 0.5);
    for (let i = 0; i < randomCount && i < shuffledRemaining.length; i++) {
      selectedQuestions.push(shuffledRemaining[i]);
    }

    return selectedQuestions.sort(() => Math.random() - 0.5);
  }
}

const QuestionCard = React.memo(({ question, selectedAnswers, onSelectAnswer, showResult, language, isMultiSelect }) => {
  const questionText =
    question.question_text_translations?.[language] || question.question_text;
  const options = question.options_translations?.[language] || question.options;

  return (
    <div className="space-y-4">
      {question.image_url && (
        <div className="rounded-xl overflow-hidden mb-4">
          <img
            src={question.image_url}
            alt="Question illustration"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      <div className="flex items-start gap-3 mb-6">
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            question.difficulty === "easy"
              ? "bg-[#eefbe7] text-[#4a9c2e]"
              : question.difficulty === "medium"
              ? "bg-[#fdfbe8] text-[#b8a525]"
              : "bg-[#fdeeed] text-[#c9342c]"
          }`}
        >
          {question.difficulty}
        </div>
        {isMultiSelect && (
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e8f4fa] text-[#3b82c4]">
            Multiple answers
          </div>
        )}
      </div>

      <h3 className="text-xl font-semibold text-zinc-900 mb-6">{questionText}</h3>

      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selectedAnswers.includes(index);
          const isCorrect = question.correct_answers.includes(index);
          const showCorrectness = showResult && (isSelected || isCorrect);

          let optionClass =
            "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ";

          if (showCorrectness) {
            if (isCorrect) {
              optionClass += "border-[#81da5a] bg-[#eefbe7] ";
            } else if (isSelected && !isCorrect) {
              optionClass += "border-[#e44138] bg-[#fdeeed] ";
            }
          } else if (isSelected) {
            optionClass += "border-[#3b82c4] bg-[#e8f4fa] ";
          } else {
            optionClass += "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 ";
          }

          return (
            <button
              key={index}
              onClick={() => !showResult && onSelectAnswer(index)}
              disabled={showResult}
              className={optionClass}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    showCorrectness && isCorrect
                      ? "bg-[#81da5a] text-white"
                      : showCorrectness && isSelected && !isCorrect
                      ? "bg-[#e44138] text-white"
                      : isSelected
                      ? "bg-[#3b82c4] text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {showCorrectness ? (
                    isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className="flex-1 text-zinc-800">{option}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

QuestionCard.displayName = "QuestionCard";

const ExplanationPanel = React.memo(({ question, language, isCorrect }) => {
  const explanation =
    question.explanation_translations?.[language] || question.explanation;

  if (!explanation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-xl border-2 ${
        isCorrect ? "border-[#d4f4c3] bg-[#eefbe7]" : "border-[#f9f3c8] bg-[#fdfbe8]"
      }`}
    >
      <div className="flex items-start gap-3">
        <Lightbulb
          className={`w-6 h-6 mt-0.5 ${isCorrect ? "text-[#5cb83a]" : "text-[#e7d356]"}`}
        />
        <div>
          <h4 className="font-semibold text-zinc-900 mb-2">Explanation</h4>
          <p className="text-zinc-700">{explanation}</p>
        </div>
      </div>
    </motion.div>
  );
});

ExplanationPanel.displayName = "ExplanationPanel";

const ProgressBar = React.memo(({ current, total, correctCount, incorrectCount }) => {
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700">
          Question {current + 1} of {total}
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#5cb83a]">
            <CheckCircle className="w-4 h-4" />
            {correctCount}
          </span>
          <span className="flex items-center gap-1 text-[#e44138]">
            <XCircle className="w-4 h-4" />
            {incorrectCount}
          </span>
        </div>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-[#3b82c4] to-[#6c376f] rounded-full"
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

const StatCard = React.memo(({ icon, label, value, trend, color }) => {
  const colorClasses = {
    primary: { bg: 'bg-[#e8f4fa]', text: 'text-[#3b82c4]' },
    green: { bg: 'bg-[#eefbe7]', text: 'text-[#5cb83a]' },
    accent: { bg: 'bg-[#f3e8f4]', text: 'text-[#6c376f]' },
    yellow: { bg: 'bg-[#fdfbe8]', text: 'text-[#e7d356]' },
  };
  const colors = colorClasses[color] || colorClasses.primary;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
    >
      <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
        {React.cloneElement(icon, { className: `w-6 h-6 ${colors.text}` })}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
      {trend !== undefined && (
        <span className={`text-xs font-medium mt-2 inline-block ${trend >= 0 ? "text-[#5cb83a]" : "text-[#e44138]"}`}>
          {trend >= 0 ? "+" : ""}{trend}%
        </span>
      )}
    </motion.div>
  );
});

StatCard.displayName = "StatCard";

const CategoryCard = React.memo(({ category, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-xl border-2 border-gray-200 bg-white p-4 hover:shadow-md hover:border-gray-300 transition-all text-left w-full"
  >
    <div className="flex items-center gap-3">
      <span className="text-2xl">{category.icon}</span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
        <p className="text-xs text-gray-500">{category.questionCount} questions</p>
      </div>
      <div className="text-right">
        <div className="text-base font-bold text-[#3b82c4] tabular-nums">
          {category.masteryPercentage}%
        </div>
        <div className="w-14 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-[#3b82c4] rounded-full transition-all"
            style={{ width: `${category.masteryPercentage}%` }}
          />
        </div>
      </div>
    </div>
  </button>
));

CategoryCard.displayName = "CategoryCard";

const MockExamTimer = React.memo(({ timeRemaining, isPaused, onTogglePause }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLowTime = timeRemaining < 300;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
        isLowTime ? "bg-[#fdeeed]" : "bg-zinc-100"
      }`}
    >
      <Timer className={`w-5 h-5 ${isLowTime ? "text-[#e44138]" : "text-zinc-600"}`} />
      <span
        className={`font-mono text-lg font-semibold tabular-nums ${
          isLowTime ? "text-[#e44138]" : "text-zinc-900"
        }`}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
      <button
        onClick={onTogglePause}
        className="p-1.5 rounded-lg hover:bg-zinc-200 transition"
        aria-label={isPaused ? "Resume" : "Pause"}
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>
    </div>
  );
});

MockExamTimer.displayName = "MockExamTimer";

const ResultsSummary = React.memo(
  ({
    totalQuestions,
    correctAnswers,
    timeSpent,
    passingScore,
    onReview,
    onRetake,
    onDashboard,
  }) => {
    const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = scorePercentage >= passingScore;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto"
      >
        <div
          className={`rounded-3xl border-2 p-8 text-center ${
            passed ? "border-[#d4f4c3] bg-[#eefbe7]" : "border-[#f9f3c8] bg-[#fdfbe8]"
          }`}
        >
          <div
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${
              passed ? "bg-[#81da5a]" : "bg-[#e7d356]"
            }`}
          >
            {passed ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-white" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 mb-2">
            {passed ? "Congratulations!" : "Keep Practicing"}
          </h2>
          <p className="text-zinc-600 mb-6">
            {passed
              ? "You passed the mock exam!"
              : `You need ${passingScore}% to pass. Keep studying!`}
          </p>

          <div className="text-6xl font-bold text-zinc-900 mb-2 tabular-nums">
            {scorePercentage}%
          </div>
          <p className="text-zinc-600 mb-6">
            {correctAnswers} of {totalQuestions} correct
          </p>

          <div className="flex items-center justify-center gap-2 text-zinc-600 mb-8">
            <Clock className="w-5 h-5" />
            <span className="tabular-nums">
              {minutes}m {seconds}s
            </span>
          </div>

          <div className="space-y-3">
            <button
              onClick={onReview}
              className="w-full py-3 px-6 rounded-xl border-2 border-zinc-200 bg-white font-semibold hover:bg-zinc-50 transition"
            >
              Review Answers
            </button>
            <button
              onClick={onRetake}
              className="w-full py-3 px-6 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition"
            >
              Try Again
            </button>
            <button
              onClick={onDashboard}
              className="w-full py-3 px-6 rounded-xl text-zinc-600 font-medium hover:text-zinc-900 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
);

ResultsSummary.displayName = "ResultsSummary";

const HazardTestCard = React.memo(({ test, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all text-left overflow-hidden"
  >
    <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center relative">
      <PlayCircle className="w-16 h-16 text-zinc-400" />
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs tabular-nums">
        {Math.floor(test.duration_seconds / 60)}:{String(test.duration_seconds % 60).padStart(2, "0")}
      </div>
    </div>
    <div className="p-5">
      <h3 className="font-bold text-zinc-900 mb-2">{test.title}</h3>
      <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{test.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{test.hazards?.length || 0} hazards</span>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            test.difficulty === "easy"
              ? "bg-[#eefbe7] text-[#4a9c2e]"
              : test.difficulty === "medium"
              ? "bg-[#fdfbe8] text-[#b8a525]"
              : "bg-[#fdeeed] text-[#c9342c]"
          }`}
        >
          {test.difficulty}
        </span>
      </div>
    </div>
  </button>
));

HazardTestCard.displayName = "HazardTestCard";

const StudyStreakBanner = React.memo(({ currentStreak, longestStreak, todayCompleted }) => (
  <div className="rounded-2xl border border-[#f9f3c8] bg-gradient-to-r from-[#fdfbe8] to-[#f9f3c8] p-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-[#fdfbe8]">
          <Flame className="w-8 h-8 text-[#e7d356]" />
        </div>
        <div>
          <h3 className="font-bold text-zinc-900">
            {currentStreak} Day Streak {todayCompleted ? "🔥" : ""}
          </h3>
          <p className="text-sm text-zinc-600">
            {todayCompleted ? "Keep it going tomorrow!" : "Practice today to continue your streak!"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-zinc-500">Best streak</p>
        <p className="text-2xl font-bold text-[#e7d356] tabular-nums">{longestStreak}</p>
      </div>
    </div>
  </div>
));

StudyStreakBanner.displayName = "StudyStreakBanner";

export default function TheoryLearning() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("dashboard");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState({});
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [language] = useState("en");
  const [showDiscountCode, setShowDiscountCode] = useState(false);
  const [selectedHazardTest, setSelectedHazardTest] = useState(null);
  const [examTimeRemaining, setExamTimeRemaining] = useState(0);
  const [isExamPaused, setIsExamPaused] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        // Check for dev auth user first
        const devUser = sessionStorage.getItem("dev_auth_user");
        if (devUser) {
          const parsedUser = JSON.parse(devUser);
          if (!isMounted) return;
          setCurrentUser(parsedUser);
          
          try {
            const students = await base44.entities.Student.filter({ email: parsedUser.email });
            if (isMounted && students.length > 0) {
              setStudent(students[0]);
            }
          } catch (e) {
            // Student record may not exist, that's okay
          }
          return;
        }
        
        const user = await base44.auth.me();
        if (!isMounted) return;

        setCurrentUser(user);

        try {
          const students = await base44.entities.Student.filter({ email: user.email });
          if (isMounted && students.length > 0) {
            setStudent(students[0]);
          }
        } catch (e) {
          // Student record may not exist, that's okay
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to load user:", error);
          // Set a default user so the page can load
          setCurrentUser({ email: 'guest@example.com', full_name: 'Guest User' });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (viewMode !== "mock-exam" || isExamPaused || examTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setExamTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewMode, isExamPaused, examTimeRemaining]);

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["theoryQuestions"],
    queryFn: () => base44.entities.TheoryQuestion.list(),
    staleTime: 300000,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["practiceAttempts", student?.id],
    queryFn: () =>
      base44.entities.PracticeAttempt.filter({ student_id: student?.id }, "-created_date"),
    enabled: !!student,
    staleTime: 60000,
  });

  const { data: hazardTests = [] } = useQuery({
    queryKey: ["hazardTests"],
    queryFn: () => base44.entities.HazardPerceptionTest.list(),
    staleTime: 300000,
  });

  const { data: studyPlan } = useQuery({
    queryKey: ["studyPlan", student?.id],
    queryFn: async () => {
      const plans = await base44.entities.StudyPlan.filter({
        student_id: student?.id,
        is_active: true,
      });
      return plans[0];
    },
    enabled: !!student,
    staleTime: 60000,
  });

  const createAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.PracticeAttempt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practiceAttempts"] });
    },
  });

  const [hazardResults, setHazardResults] = useState(null);
  const [isAnalyzingHazard, setIsAnalyzingHazard] = useState(false);
  const [hazardAIFeedback, setHazardAIFeedback] = useState(null);

  const createHazardAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.HazardAttempt.create(data),
    onSuccess: () => {
      toast.success("Hazard test completed!");
    },
  });

  const activeQuestions = useMemo(
    () => questions.filter((q) => q.is_active),
    [questions]
  );

  const categoryStats = useMemo(() => {
    const stats = new Map();

    CATEGORIES.forEach((cat) => {
      const categoryQuestions = activeQuestions.filter((q) => q.category === cat.id);
      stats.set(cat.id, { total: 0, correct: 0, questionCount: categoryQuestions.length });
    });

    attempts.forEach((attempt) => {
      if (attempt.answers) {
        Object.entries(attempt.answers).forEach(([questionId, answer]) => {
          const question = activeQuestions.find((q) => q.id === questionId);
          if (question) {
            const catStat = stats.get(question.category);
            if (catStat) {
              catStat.total++;
              if (answer.correct) catStat.correct++;
            }
          }
        });
      }
    });

    return stats;
  }, [activeQuestions, attempts]);

  const categoryInfoList = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const stats = categoryStats.get(cat.id) || { total: 0, correct: 0, questionCount: 0 };
      const masteryPercentage =
        stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

      return {
        ...cat,
        questionCount: stats.questionCount,
        masteryPercentage,
      };
    });
  }, [categoryStats]);

  const overallStats = useMemo(() => {
    const totalAttempts = attempts.length;
    const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + (a.correct_answers || 0), 0);
    const avgScore =
      totalAttempts > 0
        ? Math.round(
            attempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / totalAttempts
          )
        : 0;
    const totalTimeMinutes = Math.round(
      attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / 60
    );

    const today = new Date().toDateString();
    const todayAttempts = attempts.filter(
      (a) => new Date(a.created_date).toDateString() === today
    );
    const todayCompleted = todayAttempts.length > 0;

    let currentStreak = 0;
    let longestStreak = 0;
    const attemptDates = new Set(
      attempts.map((a) => new Date(a.created_date).toDateString())
    );

    const checkDate = new Date();
    while (attemptDates.has(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    longestStreak = Math.max(currentStreak, longestStreak);

    return {
      totalAttempts,
      totalQuestions,
      totalCorrect,
      avgScore,
      totalTimeMinutes,
      todayCompleted,
      currentStreak,
      longestStreak,
    };
  }, [attempts]);

  const initializeSession = useCallback(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowExplanation(false);
    setSessionAnswers({});
    setCorrectCount(0);
    setIncorrectCount(0);
    setSessionStartTime(Date.now());
    setQuestionStartTime(Date.now());
    setFlaggedQuestions(new Set());
  }, []);

  const startPractice = useCallback(
    (category) => {
      const filteredQuestions = category
        ? activeQuestions.filter((q) => q.category === category)
        : activeQuestions;

      const shuffled = [...filteredQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, PRACTICE_QUESTION_COUNT);

      setCurrentQuestions(shuffled);
      setSelectedCategory(category);
      initializeSession();
      setViewMode("practice");
    },
    [activeQuestions, initializeSession]
  );

  const startAdaptiveTest = useCallback(() => {
    const engine = new AdaptiveTestEngine(activeQuestions, attempts);
    const adaptiveQuestions = engine.selectAdaptiveQuestions(ADAPTIVE_QUESTION_COUNT);

    setCurrentQuestions(adaptiveQuestions);
    setSelectedCategory("adaptive");
    initializeSession();
    setViewMode("practice");

    toast.success("Adaptive test generated based on your weak areas!");
  }, [activeQuestions, attempts, initializeSession]);

  const startMockExam = useCallback(() => {
    const examQuestions = [...activeQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, MOCK_EXAM_QUESTION_COUNT);

    setCurrentQuestions(examQuestions);
    setSelectedCategory("mock-exam");
    initializeSession();
    setExamTimeRemaining(MOCK_EXAM_TIME_LIMIT);
    setIsExamPaused(false);
    setViewMode("mock-exam");
  }, [activeQuestions, initializeSession]);

  const handleSelectAnswer = useCallback(
    (answerIndex) => {
      const currentQuestion = currentQuestions[currentQuestionIndex];
      if (!currentQuestion) return;

      const isMultiSelect = currentQuestion.correct_answers.length > 1;

      if (isMultiSelect) {
        setSelectedAnswers((prev) =>
          prev.includes(answerIndex)
            ? prev.filter((i) => i !== answerIndex)
            : [...prev, answerIndex]
        );
      } else {
        setSelectedAnswers([answerIndex]);
      }
    },
    [currentQuestions, currentQuestionIndex]
  );

  const handleSubmitAnswer = useCallback(() => {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    if (!currentQuestion || selectedAnswers.length === 0) return;

    const isCorrect =
      selectedAnswers.length === currentQuestion.correct_answers.length &&
      selectedAnswers.every((a) => currentQuestion.correct_answers.includes(a));

    const timeSpentMs = Date.now() - questionStartTime;

    setSessionAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selected: selectedAnswers,
        correct: isCorrect,
        time_ms: timeSpentMs,
      },
    }));

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }

    setShowExplanation(true);
  }, [currentQuestions, currentQuestionIndex, selectedAnswers, questionStartTime]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswers([]);
      setShowExplanation(false);
      setQuestionStartTime(Date.now());
    } else {
      handleFinishSession();
    }
  }, [currentQuestionIndex, currentQuestions.length]);

  const handleFinishSession = useCallback(() => {
    const totalTimeSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    const scorePercentage =
      currentQuestions.length > 0
        ? Math.round((correctCount / currentQuestions.length) * 100)
        : 0;

    // Only save to database if student exists
    if (student) {
      createAttemptMutation.mutate({
        school_id: student.school_id,
        student_id: student.id,
        attempt_type:
          viewMode === "mock-exam"
            ? "mock_exam"
            : selectedCategory === "adaptive"
            ? "adaptive"
            : "practice",
        category: selectedCategory || undefined,
        total_questions: currentQuestions.length,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        score_percentage: scorePercentage,
        time_spent_seconds: totalTimeSeconds,
        answers: sessionAnswers,
        started_at: new Date(sessionStartTime).toISOString(),
        completed_at: new Date().toISOString(),
      });
    }

    if (viewMode === "mock-exam") {
      toast.success(scorePercentage >= PASSING_SCORE ? "You passed!" : "Keep practicing!");
    } else {
      toast.success("Practice session completed!");
    }

    setViewMode("dashboard");
  }, [
    student,
    sessionStartTime,
    correctCount,
    incorrectCount,
    currentQuestions.length,
    viewMode,
    selectedCategory,
    sessionAnswers,
    createAttemptMutation,
  ]);

  const handleSubmitExam = useCallback(() => {
    handleFinishSession();
  }, [handleFinishSession]);

  const handleToggleBookmark = useCallback((questionId) => {
    setBookmarkedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
        toast.success("Bookmark removed");
      } else {
        next.add(questionId);
        toast.success("Question bookmarked");
      }
      return next;
    });
  }, []);

  const handleToggleFlag = useCallback((questionId) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const analyzeHazardPerformance = useCallback(async (results, test) => {
    setIsAnalyzingHazard(true);
    try {
      const prompt = `You are an expert driving instructor analyzing a student's hazard perception test performance.

Test: "${test.title}"
Description: "${test.description}"
Total hazards in clip: ${test.hazards?.length || 0}
Difficulty: ${test.difficulty}

Student Performance:
- Total score: ${results.total_score || 0} points
- Hazards detected: ${results.hazards_detected || 0} out of ${test.hazards?.length || 0}
- Average reaction time: ${results.avg_reaction_time_ms || 0}ms
- Responses made: ${results.responses?.length || 0}

Hazard Details:
${test.hazards?.map((h, i) => `
Hazard ${i + 1}: ${h.type || 'Unknown type'} at ${h.start_time_ms}ms - ${h.end_time_ms}ms
- Description: ${h.description || 'No description'}
- Points scored: ${results.hazard_scores?.[i] || 0}/5
`).join('') || 'No hazard details available'}

Provide personalized feedback in JSON format with:
1. overall_assessment: A brief 1-2 sentence summary of their performance
2. strengths: Array of 2-3 things they did well (if any)
3. areas_to_improve: Array of 2-3 specific areas needing improvement
4. missed_hazard_types: Array of hazard types they missed or were slow to react to
5. tips: Array of 2-3 actionable tips for improvement
6. confidence_message: An encouraging message based on their score level`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            areas_to_improve: { type: "array", items: { type: "string" } },
            missed_hazard_types: { type: "array", items: { type: "string" } },
            tips: { type: "array", items: { type: "string" } },
            confidence_message: { type: "string" }
          }
        }
      });

      setHazardAIFeedback(response);
    } catch (error) {
      console.error("Failed to analyze hazard performance:", error);
      toast.error("Could not generate AI feedback");
    } finally {
      setIsAnalyzingHazard(false);
    }
  }, []);

  const handleHazardTestComplete = useCallback(
    async (results) => {
      if (!selectedHazardTest) return;

      setHazardResults(results);
      setViewMode("hazard-results");

      // Only save to database if student exists
      if (student) {
        createHazardAttemptMutation.mutate({
          school_id: student.school_id,
          student_id: student.id,
          test_id: selectedHazardTest.id,
          ...results,
          completed_at: new Date().toISOString(),
        });
      }

      // Trigger AI analysis
      analyzeHazardPerformance(results, selectedHazardTest);
    },
    [student, selectedHazardTest, createHazardAttemptMutation, analyzeHazardPerformance]
  );

  const handleExitHazardResults = useCallback(() => {
    setViewMode("dashboard");
    setSelectedHazardTest(null);
    setHazardResults(null);
    setHazardAIFeedback(null);
  }, []);

  const currentQuestion = currentQuestions[currentQuestionIndex];
  const isMultiSelect = currentQuestion?.correct_answers?.length > 1;



  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading theory training...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(createPageUrl("StudentDashboard"))}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>

          {viewMode !== "dashboard" && (
            <button
              onClick={() => setViewMode("dashboard")}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              Back to Overview
            </button>
          )}
        </div>

        {/* Main Header Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Theory Prep Card - Links to Exam Booking */}
          <div 
            onClick={() => navigate(createPageUrl("TheoryExamBooking"))}
            className="lg:col-span-3 bg-gradient-to-br from-[#e8f4fa] via-white to-[#eefbe7] rounded-2xl border border-[#d4eaf5] p-6 cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-[#3b82c4] text-white text-xs font-bold rounded-full">Book Now</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Ready to book your theory exam?</h2>
                <p className="text-gray-600 mb-4">Follow our step-by-step guide to book your official theory test</p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-[#3b82c4]" />
                    <span className="font-medium">€30 exam fee</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Target className="w-4 h-4 text-[#5cb83a]" />
                    <span className="font-medium">35/40 to pass</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Brain className="w-4 h-4 text-[#6c376f]" />
                    <span className="font-medium">30 min test</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#3b82c4] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* Pass & Save Discount Card - Interactive reveal */}
          <div 
            onClick={() => setShowDiscountCode(true)}
            className="relative bg-gradient-to-br from-[#eefbe7] to-[#d4f4c3] rounded-2xl border border-[#c8edb8] p-5 cursor-pointer hover:shadow-lg transition-all group overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {!showDiscountCode ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 bg-gradient-to-br from-[#5cb83a] to-[#4a9c2e] rounded-xl flex items-center justify-center mb-3 shadow-md">
                      <Percent className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Pass & Save</h3>
                    <p className="text-sm text-gray-600 leading-snug">Get <span className="font-bold text-[#5cb83a]">10% off</span> your first lesson!</p>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-[#4a9c2e] text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tap to reveal code</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-2"
                >
                  <Trophy className="w-8 h-8 text-[#e7a83e] mb-2" />
                  <p className="text-xs text-gray-600 mb-2">Your discount code:</p>
                  <div className="px-4 py-2 bg-white rounded-xl border-2 border-dashed border-[#5cb83a] mb-2">
                    <span className="text-lg font-bold text-[#4a9c2e] tracking-wider">{DISCOUNT_CODE}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Use after passing your theory test</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(DISCOUNT_CODE);
                      toast.success("Code copied!");
                    }}
                    className="mt-2 text-xs text-[#3b82c4] font-semibold hover:underline"
                  >
                    Copy code
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {viewMode === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <StudyStreakBanner
              currentStreak={overallStats.currentStreak}
              longestStreak={overallStats.longestStreak}
              todayCompleted={overallStats.todayCompleted}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Start Training</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => startPractice(null)}
                  className="rounded-xl border-2 border-gray-200 bg-white p-5 hover:shadow-md hover:border-gray-300 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#e8f4fa] flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-[#3b82c4]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Practice Mode</h3>
                  <p className="text-sm text-gray-600">Random questions from all categories</p>
                </button>

                <button
                  onClick={startAdaptiveTest}
                  className="rounded-xl border-2 border-gray-200 bg-white p-5 hover:shadow-md hover:border-gray-300 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#f3e8f4] flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-[#6c376f]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Adaptive Test</h3>
                  <p className="text-sm text-gray-600">Focus on your weak areas</p>
                </button>

                <button
                  onClick={startMockExam}
                  className="rounded-xl border-2 border-gray-200 bg-white p-5 hover:shadow-md hover:border-gray-300 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#eefbe7] flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-[#5cb83a]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Mock Exam</h3>
                  <p className="text-sm text-gray-600">Timed test under real conditions</p>
                </button>

                <button
                  onClick={() => setViewMode("hazard-selection")}
                  className="rounded-xl border-2 border-gray-200 bg-white p-5 hover:shadow-md hover:border-gray-300 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#fdeeed] flex items-center justify-center mb-4">
                    <Video className="w-6 h-6 text-[#e44138]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Hazard Perception</h3>
                  <p className="text-sm text-gray-600">Video-based hazard tests</p>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <StatCard
                icon={<Target />}
                label="Practice Sessions"
                value={overallStats.totalAttempts}
                color="primary"
              />
              <StatCard
                icon={<CheckCircle />}
                label="Questions Answered"
                value={overallStats.totalQuestions}
                color="green"
              />
              <StatCard
                icon={<TrendingUp />}
                label="Average Score"
                value={`${overallStats.avgScore}%`}
                color="accent"
              />
              <StatCard
                icon={<Clock />}
                label="Study Time"
                value={`${overallStats.totalTimeMinutes}m`}
                color="yellow"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Practice by Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categoryInfoList.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onClick={() => startPractice(category.id)}
                  />
                ))}
              </div>
            </motion.div>

            {attempts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                  <button className="text-sm font-medium text-[#3b82c4] hover:text-[#2563a3]">
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {attempts.slice(0, 5).map((attempt, index) => (
                    <motion.div
                      key={attempt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            attempt.attempt_type === "mock_exam"
                              ? "bg-[#eefbe7]"
                              : attempt.attempt_type === "adaptive"
                              ? "bg-[#f3e8f4]"
                              : "bg-[#e8f4fa]"
                          }`}
                        >
                          {attempt.attempt_type === "mock_exam" ? (
                            <GraduationCap className="w-5 h-5 text-[#5cb83a]" />
                          ) : attempt.attempt_type === "adaptive" ? (
                            <Brain className="w-5 h-5 text-[#6c376f]" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-[#3b82c4]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">
                            {attempt.attempt_type.replace("_", " ")}
                            {attempt.category &&
                              attempt.category !== "adaptive" &&
                              ` - ${CATEGORIES.find((c) => c.id === attempt.category)?.name || attempt.category}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(attempt.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold tabular-nums ${
                            (attempt.score_percentage || 0) >= PASSING_SCORE
                              ? "text-[#5cb83a]"
                              : "text-[#e7d356]"
                          }`}
                        >
                          {attempt.score_percentage || 0}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {attempt.correct_answers || 0}/{attempt.total_questions} correct
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {(viewMode === "practice" || viewMode === "mock-exam") && currentQuestion && (
          <motion.div
            key="practice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <ProgressBar
                  current={currentQuestionIndex}
                  total={currentQuestions.length}
                  correctCount={correctCount}
                  incorrectCount={incorrectCount}
                />
                {viewMode === "mock-exam" && (
                  <MockExamTimer
                    timeRemaining={examTimeRemaining}
                    isPaused={isExamPaused}
                    onTogglePause={() => setIsExamPaused((prev) => !prev)}
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 capitalize">
                    {selectedCategory === "adaptive"
                      ? "Adaptive Test"
                      : selectedCategory === "mock-exam"
                      ? "Mock Exam"
                      : CATEGORIES.find((c) => c.id === selectedCategory)?.name ||
                        "All Categories"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBookmark(currentQuestion.id)}
                    className={`p-2 rounded-lg transition ${
                      bookmarkedQuestions.has(currentQuestion.id)
                        ? "bg-[#fdfbe8] text-[#e7d356]"
                        : "hover:bg-zinc-100 text-zinc-400"
                    }`}
                    aria-label="Bookmark question"
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToggleFlag(currentQuestion.id)}
                    className={`p-2 rounded-lg transition ${
                      flaggedQuestions.has(currentQuestion.id)
                        ? "bg-[#fdeeed] text-[#e44138]"
                        : "hover:bg-zinc-100 text-zinc-400"
                    }`}
                    aria-label="Flag for review"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <QuestionCard
                question={currentQuestion}
                selectedAnswers={selectedAnswers}
                onSelectAnswer={handleSelectAnswer}
                showResult={showExplanation}
                language={language}
                isMultiSelect={isMultiSelect}
              />

              {showExplanation && (
                <div className="mt-6">
                  <ExplanationPanel
                    question={currentQuestion}
                    language={language}
                    isCorrect={sessionAnswers[currentQuestion.id]?.correct || false}
                  />
                </div>
              )}

              <div className="flex justify-center mt-8">
                {!showExplanation ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswers.length === 0}
                    className="px-8 py-3 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-8 py-3 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition flex items-center gap-2"
                  >
                    {currentQuestionIndex < currentQuestions.length - 1 ? (
                      <>
                        Next Question
                        <ChevronRight className="w-5 h-5" />
                      </>
                    ) : (
                      "Finish"
                    )}
                  </button>
                )}
              </div>
            </div>

            {viewMode === "mock-exam" && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-600">
                    {flaggedQuestions.size} questions flagged for review
                  </p>
                  <button
                    onClick={handleSubmitExam}
                    className="px-4 py-2 rounded-lg border border-[#f9d4d2] text-[#e44138] font-medium hover:bg-[#fdeeed] transition"
                  >
                    End Exam
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {viewMode === "hazard-selection" && (
          <motion.div
            key="hazard-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Hazard Perception Tests</h2>
              <p className="text-zinc-600">
                Identify developing hazards in video clips to improve your awareness
              </p>
            </div>

            {hazardTests.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <Video className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600">No hazard perception tests available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hazardTests
                  .filter((t) => t.is_active)
                  .map((test) => (
                    <HazardTestCard
                      key={test.id}
                      test={test}
                      onClick={() => {
                        setSelectedHazardTest(test);
                        setViewMode("hazard-test");
                      }}
                    />
                  ))}
              </div>
            )}
          </motion.div>
        )}

        {viewMode === "hazard-test" && selectedHazardTest && (
          <motion.div
            key="hazard-test"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{selectedHazardTest.title}</h2>
                  <p className="text-zinc-600">{selectedHazardTest.description}</p>
                </div>
                <button
                  onClick={() => {
                    setViewMode("hazard-selection");
                    setSelectedHazardTest(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-zinc-200 font-medium hover:bg-zinc-50 transition"
                >
                  Exit
                </button>
              </div>

              <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center relative cursor-pointer"
                onClick={() => {
                  // Simulate test completion for demo
                  handleHazardTestComplete({
                    total_score: Math.floor(Math.random() * 20) + 10,
                    hazards_detected: Math.floor(Math.random() * (selectedHazardTest.hazards?.length || 3)) + 1,
                    avg_reaction_time_ms: Math.floor(Math.random() * 1500) + 500,
                    responses: Array(Math.floor(Math.random() * 5) + 2).fill(null).map((_, i) => ({
                      time_ms: i * 3000 + Math.random() * 2000,
                      score: Math.floor(Math.random() * 5)
                    })),
                    hazard_scores: (selectedHazardTest.hazards || []).map(() => Math.floor(Math.random() * 5))
                  });
                }}
              >
                <div className="text-center text-white">
                  <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-zinc-400">Video player placeholder</p>
                  <p className="text-sm text-zinc-500 mt-2">
                    Click anywhere when you spot a developing hazard
                  </p>
                  <p className="text-xs text-[#81da5a] mt-3">
                    (Click to simulate test completion with AI feedback)
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="p-2 rounded-lg hover:bg-zinc-100 transition">
                    <Play className="w-6 h-6 text-zinc-600" />
                  </button>
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <span className="tabular-nums">0:00</span>
                    <span>/</span>
                    <span className="tabular-nums">
                      {Math.floor(selectedHazardTest.duration_seconds / 60)}:
                      {String(selectedHazardTest.duration_seconds % 60).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-zinc-100 transition">
                    <Volume2 className="w-5 h-5 text-zinc-600" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-zinc-100 transition">
                    <Maximize className="w-5 h-5 text-zinc-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 mb-3">Instructions</h3>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#5cb83a] mt-0.5 flex-shrink-0" />
                  <span>Click or tap when you see a developing hazard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#5cb83a] mt-0.5 flex-shrink-0" />
                  <span>Earlier responses score more points</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#5cb83a] mt-0.5 flex-shrink-0" />
                  <span>Avoid clicking too frequently - this may result in zero points</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#5cb83a] mt-0.5 flex-shrink-0" />
                  <span>
                    There are {selectedHazardTest.hazards?.length || 0} hazards in this clip
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}

        {viewMode === "hazard-results" && selectedHazardTest && hazardResults && (
          <motion.div
            key="hazard-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Score Summary Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  (hazardResults.hazards_detected || 0) >= (selectedHazardTest.hazards?.length || 1) * 0.7
                    ? "bg-[#eefbe7]"
                    : "bg-[#fdfbe8]"
                }`}>
                  {(hazardResults.hazards_detected || 0) >= (selectedHazardTest.hazards?.length || 1) * 0.7 ? (
                    <Trophy className="w-12 h-12 text-[#5cb83a]" />
                  ) : (
                    <Target className="w-12 h-12 text-[#e7d356]" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                  {selectedHazardTest.title} - Complete
                </h2>
                <p className="text-zinc-600">
                  {hazardResults.hazards_detected || 0} of {selectedHazardTest.hazards?.length || 0} hazards detected
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 rounded-xl bg-[#e8f4fa]">
                  <p className="text-3xl font-bold text-[#3b82c4] tabular-nums">{hazardResults.total_score || 0}</p>
                  <p className="text-sm text-zinc-600 mt-1">Total Points</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-[#eefbe7]">
                  <p className="text-3xl font-bold text-[#5cb83a] tabular-nums">{hazardResults.hazards_detected || 0}</p>
                  <p className="text-sm text-zinc-600 mt-1">Hazards Found</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-[#f3e8f4]">
                  <p className="text-3xl font-bold text-[#6c376f] tabular-nums">{Math.round((hazardResults.avg_reaction_time_ms || 0) / 1000 * 10) / 10}s</p>
                  <p className="text-sm text-zinc-600 mt-1">Avg Reaction</p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setHazardResults(null);
                    setHazardAIFeedback(null);
                    setViewMode("hazard-test");
                  }}
                  className="px-6 py-3 rounded-xl border border-zinc-200 font-semibold hover:bg-zinc-50 transition"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Try Again
                </button>
                <button
                  onClick={handleExitHazardResults}
                  className="px-6 py-3 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* AI Feedback Card */}
            <div className="rounded-2xl border-2 border-[#d4eaf5] bg-gradient-to-br from-[#e8f4fa] to-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82c4] to-[#6c376f] flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">AI Performance Analysis</h3>
                  <p className="text-sm text-zinc-600">Personalized feedback based on your test</p>
                </div>
              </div>

              {isAnalyzingHazard ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#3b82c4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600">Analyzing your performance...</p>
                  </div>
                </div>
              ) : hazardAIFeedback ? (
                <div className="space-y-6">
                  {/* Overall Assessment */}
                  <div className="p-4 rounded-xl bg-white border border-zinc-200">
                    <p className="text-zinc-800 leading-relaxed">{hazardAIFeedback.overall_assessment}</p>
                  </div>

                  {/* Confidence Message */}
                  {hazardAIFeedback.confidence_message && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#eefbe7] to-[#fdfbe8] border border-[#c8edb8]">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-[#5cb83a] mt-0.5 flex-shrink-0" />
                        <p className="text-zinc-700 font-medium">{hazardAIFeedback.confidence_message}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    {hazardAIFeedback.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-[#5cb83a]" />
                          What You Did Well
                        </h4>
                        <ul className="space-y-2">
                          {hazardAIFeedback.strengths.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#5cb83a] mt-2 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Areas to Improve */}
                    {hazardAIFeedback.areas_to_improve?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                          <Target className="w-5 h-5 text-[#e7d356]" />
                          Areas to Improve
                        </h4>
                        <ul className="space-y-2">
                          {hazardAIFeedback.areas_to_improve.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#e7d356] mt-2 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Missed Hazard Types */}
                  {hazardAIFeedback.missed_hazard_types?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#e44138]" />
                        Hazard Types to Focus On
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {hazardAIFeedback.missed_hazard_types.map((type, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-[#fdeeed] text-[#c9342c] text-sm font-medium">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {hazardAIFeedback.tips?.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#f3e8f4] border border-[#e5d0e6]">
                      <h4 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-[#6c376f]" />
                        Tips for Improvement
                      </h4>
                      <ul className="space-y-2">
                        {hazardAIFeedback.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                            <span className="font-bold text-[#6c376f]">{i + 1}.</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <p>AI feedback unavailable</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}