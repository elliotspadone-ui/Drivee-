import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Link2,
  Unlink,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Plus,
  Trash2,
  HelpCircle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG = {
  unmatched: { label: "Unmatched", color: "bg-amber-100 text-amber-700", icon: Clock },
  matched: { label: "Matched", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  excluded: { label: "Excluded", color: "bg-gray-100 text-gray-600", icon: XCircle },
  discrepancy: { label: "Discrepancy", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const STATEMENT_STATUS = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  reconciled: { label: "Reconciled", color: "bg-emerald-100 text-emerald-700" },
  discrepancy: { label: "Has Discrepancies", color: "bg-red-100 text-red-700" },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const calculateMatchScore = (bankTxn, recordTxn) => {
  let score = 0;
  
  // Amount match (most important)
  const amountDiff = Math.abs(Math.abs(bankTxn.amount) - Math.abs(recordTxn.amount));
  if (amountDiff === 0) score += 50;
  else if (amountDiff < 1) score += 40;
  else if (amountDiff < 5) score += 20;
  
  // Date proximity
  const bankDate = new Date(bankTxn.transaction_date);
  const recordDate = new Date(recordTxn.payment_date || recordTxn.expense_date || recordTxn.created_date);
  const daysDiff = Math.abs((bankDate - recordDate) / (1000 * 60 * 60 * 24));
  if (daysDiff === 0) score += 30;
  else if (daysDiff <= 1) score += 25;
  else if (daysDiff <= 3) score += 15;
  else if (daysDiff <= 7) score += 5;
  
  // Reference/description match
  const bankDesc = (bankTxn.description || "").toLowerCase();
  const recordRef = (recordTxn.reference || recordTxn.transaction_id || "").toLowerCase();
  if (bankDesc && recordRef && bankDesc.includes(recordRef)) score += 20;
  
  return Math.min(score, 100);
};

// ============================================
// COMPONENTS
// ============================================

const StatCard = ({ label, value, icon: Icon, color, subtext }) => (
  <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-zinc-500">{label}</span>
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="text-2xl font-bold text-zinc-900">{value}</div>
    {subtext && <div className="text-xs text-zinc-400 mt-1">{subtext}</div>}
  </div>
);

const StatusBadge = ({ status, type = "transaction" }) => {
  const config = type === "statement" ? STATEMENT_STATUS[status] : STATUS_CONFIG[status];
  if (!config) return null;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon && <config.icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
};

const TransactionRow = ({ 
  transaction, 
  isSelected, 
  onSelect, 
  onMatch, 
  onExclude,
  onUnmatch,
  matchedRecord 
}) => {
  const isCredit = transaction.type === "credit";
  
  return (
    <div 
      className={`p-4 border-b border-zinc-100 hover:bg-zinc-50 transition cursor-pointer ${
        isSelected ? "bg-indigo-50 border-l-4 border-l-indigo-500" : ""
      }`}
      onClick={() => onSelect(transaction)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isCredit ? "bg-emerald-100" : "bg-red-100"
          }`}>
            {isCredit ? (
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-zinc-900 truncate">{transaction.description || "No description"}</p>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{format(parseISO(transaction.transaction_date), "MMM d, yyyy")}</span>
              {transaction.reference && (
                <>
                  <span>•</span>
                  <span className="font-mono">{transaction.reference}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-bold font-mono ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
              {isCredit ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
            </p>
            {transaction.balance !== undefined && (
              <p className="text-xs text-zinc-400">Bal: {formatCurrency(transaction.balance)}</p>
            )}
          </div>
          
          <StatusBadge status={transaction.status} />
          
          <div className="flex items-center gap-1">
            {transaction.status === "matched" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={(e) => { e.stopPropagation(); onUnmatch(transaction); }}
              >
                <Unlink className="w-4 h-4" />
              </Button>
            ) : transaction.status === "unmatched" ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-indigo-600 hover:bg-indigo-50"
                  onClick={(e) => { e.stopPropagation(); onMatch(transaction); }}
                >
                  <Link2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:bg-zinc-100"
                  onClick={(e) => { e.stopPropagation(); onExclude(transaction); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      
      {matchedRecord && (
        <div className="mt-3 ml-13 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-emerald-800">Matched to:</span>
            <span className="text-emerald-700">
              {matchedRecord.type === "payment" ? "Payment" : "Expense"} - {formatCurrency(matchedRecord.amount)}
            </span>
            {transaction.match_confidence && (
              <span className="ml-auto text-xs text-emerald-600">
                {transaction.match_confidence}% confidence
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MatchingPanel = ({ 
  bankTransaction, 
  payments, 
  expenses, 
  onMatch, 
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPayments, setShowPayments] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  
  const isDebit = bankTransaction?.type === "debit";
  
  const potentialMatches = useMemo(() => {
    if (!bankTransaction) return [];
    
    const candidates = [];
    
    // For debits (money out), look at expenses
    // For credits (money in), look at payments
    if (showPayments && !isDebit) {
      payments.forEach(p => {
        if (p.status === "completed") {
          const score = calculateMatchScore(bankTransaction, p);
          if (score > 20) {
            candidates.push({
              ...p,
              type: "payment",
              matchScore: score,
              recordDate: p.payment_date || p.created_date,
            });
          }
        }
      });
    }
    
    if (showExpenses && isDebit) {
      expenses.forEach(e => {
        const score = calculateMatchScore(bankTransaction, e);
        if (score > 20) {
          candidates.push({
            ...e,
            type: "expense",
            matchScore: score,
            recordDate: e.expense_date || e.created_date,
          });
        }
      });
    }
    
    // Filter by search term
    let filtered = candidates;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = candidates.filter(c => 
        (c.description || "").toLowerCase().includes(term) ||
        (c.reference || "").toLowerCase().includes(term) ||
        (c.category || "").toLowerCase().includes(term)
      );
    }
    
    return filtered.sort((a, b) => b.matchScore - a.matchScore);
  }, [bankTransaction, payments, expenses, searchTerm, showPayments, showExpenses, isDebit]);
  
  if (!bankTransaction) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden"
    >
      <div className="p-4 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-indigo-900">Match Transaction</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-3 bg-white rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900">{bankTransaction.description}</p>
              <p className="text-sm text-zinc-500">
                {format(parseISO(bankTransaction.transaction_date), "MMM d, yyyy")}
              </p>
            </div>
            <p className={`font-bold font-mono ${
              bankTransaction.type === "credit" ? "text-emerald-600" : "text-red-600"
            }`}>
              {bankTransaction.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(bankTransaction.amount))}
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-b border-zinc-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {potentialMatches.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            <p className="font-medium">No matching records found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {potentialMatches.map((match) => (
              <div
                key={match.id}
                className="p-4 hover:bg-zinc-50 cursor-pointer transition"
                onClick={() => onMatch(bankTransaction, match)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        match.type === "payment" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {match.type === "payment" ? "Payment" : "Expense"}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {format(parseISO(match.recordDate), "MMM d")}
                      </span>
                    </div>
                    <p className="font-medium text-zinc-900 mt-1 truncate">
                      {match.description || match.category || match.payment_type || "No description"}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold font-mono text-zinc-900">
                      {formatCurrency(match.amount)}
                    </p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className={`text-xs font-semibold ${
                        match.matchScore >= 70 ? "text-emerald-600" :
                        match.matchScore >= 40 ? "text-amber-600" : "text-zinc-500"
                      }`}>
                        {match.matchScore}% match
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Parse CSV
    if (selectedFile.name.endsWith('.csv')) {
      const text = await selectedFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const transactions = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 3) continue;
        
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const descIdx = headers.findIndex(h => h.includes('description') || h.includes('details'));
        const amountIdx = headers.findIndex(h => h.includes('amount'));
        const creditIdx = headers.findIndex(h => h.includes('credit'));
        const debitIdx = headers.findIndex(h => h.includes('debit'));
        const balanceIdx = headers.findIndex(h => h.includes('balance'));
        const refIdx = headers.findIndex(h => h.includes('reference') || h.includes('ref'));
        
        let amount = 0;
        let type = "credit";
        
        if (amountIdx >= 0) {
          amount = parseFloat(values[amountIdx]?.replace(/[^0-9.-]/g, '') || 0);
          type = amount >= 0 ? "credit" : "debit";
          amount = Math.abs(amount);
        } else {
          const credit = parseFloat(values[creditIdx]?.replace(/[^0-9.-]/g, '') || 0);
          const debit = parseFloat(values[debitIdx]?.replace(/[^0-9.-]/g, '') || 0);
          if (credit > 0) {
            amount = credit;
            type = "credit";
          } else if (debit > 0) {
            amount = debit;
            type = "debit";
          }
        }
        
        if (amount > 0) {
          transactions.push({
            transaction_date: values[dateIdx]?.trim() || new Date().toISOString().split('T')[0],
            description: values[descIdx]?.trim() || "",
            amount,
            type,
            balance: balanceIdx >= 0 ? parseFloat(values[balanceIdx]?.replace(/[^0-9.-]/g, '') || 0) : undefined,
            reference: refIdx >= 0 ? values[refIdx]?.trim() : undefined,
          });
        }
      }
      
      setParsedTransactions(transactions);
    }
  };
  
  const handleImport = async () => {
    if (!accountName || parsedTransactions.length === 0) {
      toast.error("Please provide account name and valid transactions");
      return;
    }
    
    setIsUploading(true);
    try {
      await onImport({
        accountName,
        accountNumber,
        transactions: parsedTransactions,
      });
      onClose();
      toast.success(`Imported ${parsedTransactions.length} transactions`);
    } catch (error) {
      toast.error("Failed to import statement");
    } finally {
      setIsUploading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900">Import Bank Statement</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Account Name *
              </label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Business Current Account"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Account Number (last 4 digits)
              </label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., 1234"
                maxLength={4}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:border-indigo-400 transition cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-zinc-400 mb-3" />
                <p className="font-medium text-zinc-700">
                  {file ? file.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-zinc-500 mt-1">CSV files only</p>
              </label>
            </div>
          </div>
          
          {parsedTransactions.length > 0 && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">
                  {parsedTransactions.length} transactions parsed
                </span>
              </div>
              <div className="text-sm text-emerald-700">
                Total credits: {formatCurrency(parsedTransactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0))}
                {" • "}
                Total debits: {formatCurrency(parsedTransactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={isUploading || parsedTransactions.length === 0}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Import {parsedTransactions.length} Transactions
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function BankReconciliation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [matchingTransaction, setMatchingTransaction] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data queries
  const { data: statements = [], isLoading: loadingStatements } = useQuery({
    queryKey: ["bankStatements"],
    queryFn: () => base44.entities.BankStatement.list("-created_date"),
  });
  
  const { data: bankTransactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["bankTransactions", selectedStatement?.id],
    queryFn: () => base44.entities.BankTransaction.filter({ statement_id: selectedStatement.id }),
    enabled: !!selectedStatement?.id,
  });
  
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
  });
  
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list(),
  });
  
  // Mutations
  const createStatementMutation = useMutation({
    mutationFn: async ({ accountName, accountNumber, transactions }) => {
      const statement = await base44.entities.BankStatement.create({
        account_name: accountName,
        account_number: accountNumber,
        statement_date: new Date().toISOString().split('T')[0],
        status: "pending",
      });
      
      for (const txn of transactions) {
        await base44.entities.BankTransaction.create({
          statement_id: statement.id,
          ...txn,
          status: "unmatched",
        });
      }
      
      return statement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankStatements"] });
    },
  });
  
  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
    },
  });
  
  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const unmatched = bankTransactions.filter(t => t.status === "unmatched");
      let matchCount = 0;
      
      for (const txn of unmatched) {
        const isDebit = txn.type === "debit";
        const candidates = isDebit ? expenses : payments.filter(p => p.status === "completed");
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const candidate of candidates) {
          const score = calculateMatchScore(txn, candidate);
          if (score > bestScore && score >= 70) {
            bestScore = score;
            bestMatch = { ...candidate, type: isDebit ? "expense" : "payment" };
          }
        }
        
        if (bestMatch) {
          await base44.entities.BankTransaction.update(txn.id, {
            status: "matched",
            matched_payment_id: bestMatch.type === "payment" ? bestMatch.id : null,
            matched_expense_id: bestMatch.type === "expense" ? bestMatch.id : null,
            match_confidence: bestScore,
          });
          matchCount++;
        }
      }
      
      return matchCount;
    },
    onSuccess: (matchCount) => {
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      toast.success(`Auto-matched ${matchCount} transactions`);
    },
  });
  
  // Handlers
  const handleMatch = async (bankTxn, record) => {
    await updateTransactionMutation.mutateAsync({
      id: bankTxn.id,
      data: {
        status: "matched",
        matched_payment_id: record.type === "payment" ? record.id : null,
        matched_expense_id: record.type === "expense" ? record.id : null,
        match_confidence: record.matchScore,
      },
    });
    setMatchingTransaction(null);
    toast.success("Transaction matched successfully");
  };
  
  const handleUnmatch = async (txn) => {
    await updateTransactionMutation.mutateAsync({
      id: txn.id,
      data: {
        status: "unmatched",
        matched_payment_id: null,
        matched_expense_id: null,
        match_confidence: null,
      },
    });
    toast.success("Transaction unmatched");
  };
  
  const handleExclude = async (txn) => {
    await updateTransactionMutation.mutateAsync({
      id: txn.id,
      data: { status: "excluded" },
    });
    toast.success("Transaction excluded from reconciliation");
  };
  
  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = bankTransactions;
    
    if (filter !== "all") {
      filtered = filtered.filter(t => t.status === filter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        (t.description || "").toLowerCase().includes(term) ||
        (t.reference || "").toLowerCase().includes(term)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  }, [bankTransactions, filter, searchTerm]);
  
  // Stats
  const stats = useMemo(() => {
    const total = bankTransactions.length;
    const matched = bankTransactions.filter(t => t.status === "matched").length;
    const unmatched = bankTransactions.filter(t => t.status === "unmatched").length;
    const excluded = bankTransactions.filter(t => t.status === "excluded").length;
    const totalCredits = bankTransactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const totalDebits = bankTransactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    
    return { total, matched, unmatched, excluded, totalCredits, totalDebits };
  }, [bankTransactions]);
  
  const isLoading = loadingStatements || loadingTransactions;
  
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(createPageUrl("Finance"))}
            className="p-2 hover:bg-zinc-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Bank Reconciliation</h1>
            <p className="text-sm text-zinc-500">
              Match bank transactions with your records to ensure accuracy
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Statement
          </Button>
          {selectedStatement && (
            <Button onClick={() => autoMatchMutation.mutate()} disabled={autoMatchMutation.isPending}>
              {autoMatchMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Auto-Match
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statements List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Bank Statements</h3>
            </div>
            
            <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
              {statements.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <p className="font-medium">No statements imported</p>
                  <p className="text-sm mt-1">Import your first bank statement to get started</p>
                </div>
              ) : (
                statements.map((statement) => (
                  <div
                    key={statement.id}
                    className={`p-4 cursor-pointer transition hover:bg-zinc-50 ${
                      selectedStatement?.id === statement.id ? "bg-indigo-50 border-l-4 border-l-indigo-500" : ""
                    }`}
                    onClick={() => setSelectedStatement(statement)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-zinc-900">{statement.account_name}</span>
                      <StatusBadge status={statement.status} type="statement" />
                    </div>
                    <div className="text-sm text-zinc-500">
                      {format(parseISO(statement.statement_date), "MMM d, yyyy")}
                    </div>
                    {statement.account_number && (
                      <div className="text-xs text-zinc-400 font-mono mt-1">
                        ****{statement.account_number}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          {!selectedStatement ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Select a Statement</h3>
              <p className="text-zinc-500 mb-6">
                Choose a bank statement from the list or import a new one to start reconciling
              </p>
              <Button onClick={() => setShowImportModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import Bank Statement
              </Button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="Total Transactions"
                  value={stats.total}
                  icon={FileText}
                  color="bg-zinc-100 text-zinc-600"
                />
                <StatCard
                  label="Matched"
                  value={stats.matched}
                  icon={CheckCircle2}
                  color="bg-emerald-100 text-emerald-600"
                  subtext={`${stats.total > 0 ? ((stats.matched / stats.total) * 100).toFixed(0) : 0}% complete`}
                />
                <StatCard
                  label="Unmatched"
                  value={stats.unmatched}
                  icon={Clock}
                  color="bg-amber-100 text-amber-600"
                />
                <StatCard
                  label="Net Movement"
                  value={formatCurrency(stats.totalCredits - stats.totalDebits)}
                  icon={DollarSign}
                  color="bg-indigo-100 text-indigo-600"
                />
              </div>
              
              <div className="flex gap-6">
                {/* Transactions List */}
                <div className={`flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden ${
                  matchingTransaction ? "lg:w-1/2" : "w-full"
                }`}>
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Transactions</option>
                      <option value="unmatched">Unmatched</option>
                      <option value="matched">Matched</option>
                      <option value="excluded">Excluded</option>
                    </select>
                  </div>
                  
                  <div className="max-h-[500px] overflow-y-auto">
                    {filteredTransactions.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500">
                        <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                        <p className="font-medium">No transactions found</p>
                      </div>
                    ) : (
                      filteredTransactions.map((txn) => (
                        <TransactionRow
                          key={txn.id}
                          transaction={txn}
                          isSelected={selectedTransaction?.id === txn.id}
                          onSelect={setSelectedTransaction}
                          onMatch={(t) => setMatchingTransaction(t)}
                          onExclude={handleExclude}
                          onUnmatch={handleUnmatch}
                        />
                      ))
                    )}
                  </div>
                </div>
                
                {/* Matching Panel */}
                <AnimatePresence>
                  {matchingTransaction && (
                    <div className="lg:w-1/2">
                      <MatchingPanel
                        bankTransaction={matchingTransaction}
                        payments={payments}
                        expenses={expenses}
                        onMatch={handleMatch}
                        onClose={() => setMatchingTransaction(null)}
                      />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(data) => createStatementMutation.mutateAsync(data)}
      />
    </div>
  );
}