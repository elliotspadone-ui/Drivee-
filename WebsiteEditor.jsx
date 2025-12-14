import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Save,
  Globe,
  Palette,
  Image as ImageIcon,
  Type,
  Layout as LayoutIcon,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
  Settings,
  Languages,
  Code,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Wand2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Filter,
  MoreVertical,
  Share2,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Zap,
  Crown,
  Star,
  FileText,
  Video,
  MessageSquare,
  Calendar,
  Users,
  Award,
  Target,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  Grid,
  List,
  Edit3,
  Move,
  Lock,
  Unlock,
  Clock,
  Mail,
  Phone,
  MapPin,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const TABS = [
  { id: "general", label: "General", icon: Settings, description: "Basic website settings" },
  { id: "sections", label: "Sections", icon: LayoutIcon, description: "Manage page sections" },
  { id: "design", label: "Design", icon: Palette, description: "Colors, fonts & themes" },
  { id: "seo", label: "SEO", icon: Search, description: "Search engine optimization" },
  { id: "languages", label: "Languages", icon: Languages, description: "Multi-language support" },
  { id: "integrations", label: "Integrations", icon: Zap, description: "Analytics & tracking" },
  { id: "domain", label: "Domain", icon: Globe, description: "Domain configuration" },
  { id: "advanced", label: "Advanced", icon: Code, description: "Custom code & scripts" },
];

const THEMES = [
  { id: "modern", name: "Modern", description: "Clean and contemporary design" },
  { id: "elegant", name: "Elegant", description: "Sophisticated serif typography" },
  { id: "bold", name: "Bold", description: "High contrast and impactful" },
  { id: "minimal", name: "Minimal", description: "Simple and distraction-free" },
  { id: "professional", name: "Professional", description: "Corporate and trustworthy" },
  { id: "vibrant", name: "Vibrant", description: "Colorful and energetic" },
];

const SECTION_TYPES = [
  { type: "hero", name: "Hero", icon: Sparkles, description: "Main headline section" },
  { type: "about", name: "About", icon: Info, description: "About your school" },
  { type: "services", name: "Services", icon: Grid, description: "Lesson packages" },
  { type: "instructors", name: "Instructors", icon: Users, description: "Meet the team" },
  { type: "testimonials", name: "Testimonials", icon: MessageSquare, description: "Student reviews" },
  { type: "faq", name: "FAQ", icon: HelpCircle, description: "Common questions" },
  { type: "contact", name: "Contact", icon: Mail, description: "Contact information" },
  { type: "gallery", name: "Gallery", icon: ImageIcon, description: "Photo gallery" },
  { type: "video", name: "Video", icon: Video, description: "Video showcase" },
  { type: "stats", name: "Statistics", icon: BarChart3, description: "Key numbers" },
  { type: "features", name: "Features", icon: Award, description: "Key benefits" },
  { type: "cta", name: "Call to Action", icon: Target, description: "Conversion section" },
  { type: "pricing", name: "Pricing", icon: Tag, description: "Pricing table" },
  { type: "trust_badges", name: "Trust Badges", icon: Award, description: "Certifications" },
  { type: "custom", name: "Custom", icon: Code, description: "Custom HTML section" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
];

const FONT_FAMILIES = [
  { id: "inter", name: "Inter", css: "'Inter', sans-serif" },
  { id: "roboto", name: "Roboto", css: "'Roboto', sans-serif" },
  { id: "poppins", name: "Poppins", css: "'Poppins', sans-serif" },
  { id: "montserrat", name: "Montserrat", css: "'Montserrat', sans-serif" },
  { id: "playfair", name: "Playfair Display", css: "'Playfair Display', serif" },
  { id: "lato", name: "Lato", css: "'Lato', sans-serif" },
  { id: "open-sans", name: "Open Sans", css: "'Open Sans', sans-serif" },
  { id: "nunito", name: "Nunito", css: "'Nunito', sans-serif" },
];

const Input = React.memo(({ value, onChange, placeholder, type = "text", className = "", disabled }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-zinc-50 disabled:cursor-not-allowed transition ${className}`}
  />
));

Input.displayName = "Input";

const Textarea = React.memo(({ value, onChange, placeholder, rows = 4, className = "" }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition ${className}`}
  />
));

Textarea.displayName = "Textarea";

const Select = React.memo(({ value, onChange, options, placeholder, className = "" }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition ${className}`}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
));

Select.displayName = "Select";

const FormField = React.memo(({ label, description, required, children }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {description && <p className="text-xs text-zinc-500">{description}</p>}
  </div>
));

FormField.displayName = "FormField";

const Card = React.memo(({ title, description, icon: Icon, children, className = "", actions }) => (
  <div className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between p-6 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-indigo-600" />
            </div>
          )}
          <div>
            {title && <h3 className="font-semibold text-zinc-900">{title}</h3>}
            {description && <p className="text-sm text-zinc-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
));

Card.displayName = "Card";

const Toggle = React.memo(({ enabled, onChange, label }) => (
  <button
    onClick={() => onChange(!enabled)}
    className="flex items-center gap-3"
    type="button"
  >
    <div
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? "bg-indigo-600" : "bg-zinc-300"
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </div>
    {label && <span className="text-sm text-zinc-700">{label}</span>}
  </button>
));

Toggle.displayName = "Toggle";

const ColorPicker = React.memo(({ value, onChange, label, presets = [] }) => {
  const defaultPresets = ["#4f46e5", "#7c3aed", "#ec4899", "#f97316", "#10b981", "#0ea5e9", "#6366f1", "#8b5cf6"];
  const allPresets = [...new Set([...presets, ...defaultPresets])];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 rounded-xl border border-zinc-200 cursor-pointer"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {allPresets.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-lg border-2 transition-all ${
              value === color ? "border-zinc-900 scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
});

ColorPicker.displayName = "ColorPicker";

const ImageUploader = React.memo(({ value, onChange, label, description, aspectRatio = "16/9" }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {description && <p className="text-xs text-zinc-500">{description}</p>}

      <div
        className="relative rounded-xl border-2 border-dashed border-zinc-200 hover:border-indigo-400 transition-colors overflow-hidden"
        style={{ aspectRatio }}
      >
        {value ? (
          <div className="relative w-full h-full group">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <label className="px-4 py-2 bg-white rounded-lg cursor-pointer font-medium text-sm hover:bg-zinc-50 transition">
                Replace
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                />
              </label>
              <button
                onClick={() => onChange("")}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer py-8">
            {isUploading ? (
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-zinc-400 mb-3" />
                <p className="text-sm font-medium text-zinc-700">Click to upload</p>
                <p className="text-xs text-zinc-500">PNG, JPG up to 5MB</p>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    </div>
  );
});

ImageUploader.displayName = "ImageUploader";

const SectionEditor = React.memo(({ section, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localData, setLocalData] = useState(section);

  useEffect(() => {
    setLocalData(section);
  }, [section]);

  const sectionConfig = SECTION_TYPES.find((s) => s.type === section.section_type);
  const Icon = sectionConfig?.icon || FileText;

  const handleSave = useCallback(() => {
    onUpdate(localData);
    setIsExpanded(false);
  }, [localData, onUpdate]);

  return (
    <motion.div
      layout
      className={`rounded-2xl border ${
        section.is_visible ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50"
      } shadow-sm overflow-hidden`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="cursor-grab">
            <GripVertical className="w-5 h-5 text-zinc-400" />
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              section.is_visible ? "bg-indigo-50" : "bg-zinc-100"
            }`}
          >
            <Icon className={`w-5 h-5 ${section.is_visible ? "text-indigo-600" : "text-zinc-400"}`} />
          </div>
          <div>
            <h4 className={`font-medium ${section.is_visible ? "text-zinc-900" : "text-zinc-400"}`}>
              {sectionConfig?.name || "Section"}
            </h4>
            <p className="text-xs text-zinc-500">{section.title || "Untitled"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ is_visible: !section.is_visible })}
            className={`p-2 rounded-lg transition ${
              section.is_visible ? "hover:bg-zinc-100" : "hover:bg-zinc-200"
            }`}
            title={section.is_visible ? "Hide section" : "Show section"}
          >
            {section.is_visible ? (
              <Eye className="w-4 h-4 text-zinc-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {!isFirst && (
            <button
              onClick={onMoveUp}
              className="p-2 rounded-lg hover:bg-zinc-100 transition"
              title="Move up"
            >
              <ArrowUp className="w-4 h-4 text-zinc-600" />
            </button>
          )}

          {!isLast && (
            <button
              onClick={onMoveDown}
              className="p-2 rounded-lg hover:bg-zinc-100 transition"
              title="Move down"
            >
              <ArrowDown className="w-4 h-4 text-zinc-600" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-zinc-100 transition"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-50 transition"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-2 border-t border-zinc-100 space-y-5">
              <FormField label="Title">
                <Input
                  value={localData.title || ""}
                  onChange={(e) => setLocalData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Section title"
                />
              </FormField>

              <FormField label="Subtitle">
                <Input
                  value={localData.subtitle || ""}
                  onChange={(e) => setLocalData((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="Optional subtitle"
                />
              </FormField>

              <FormField label="Content">
                <Textarea
                  value={localData.content || ""}
                  onChange={(e) => setLocalData((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Section content..."
                  rows={5}
                />
              </FormField>

              <ImageUploader
                label="Section Image"
                value={localData.image_url}
                onChange={(url) => setLocalData((p) => ({ ...p, image_url: url }))}
              />

              {(section.section_type === "hero" || section.section_type === "cta") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Button Text">
                    <Input
                      value={localData.cta_text || ""}
                      onChange={(e) => setLocalData((p) => ({ ...p, cta_text: e.target.value }))}
                      placeholder="Book Now"
                    />
                  </FormField>
                  <FormField label="Button URL">
                    <Input
                      value={localData.cta_url || ""}
                      onChange={(e) => setLocalData((p) => ({ ...p, cta_url: e.target.value }))}
                      placeholder="#booking"
                    />
                  </FormField>
                </div>
              )}

              {section.section_type === "video" && (
                <FormField label="Video URL" description="YouTube or Vimeo embed URL">
                  <Input
                    value={localData.video_url || ""}
                    onChange={(e) => setLocalData((p) => ({ ...p, video_url: e.target.value }))}
                    placeholder="https://youtube.com/embed/..."
                  />
                </FormField>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

SectionEditor.displayName = "SectionEditor";

const AddSectionModal = React.memo(({ isOpen, onClose, onAdd, existingSections }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Add Section</h2>
              <p className="text-sm text-zinc-500">Choose a section type to add to your website</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SECTION_TYPES.map((section) => {
                const exists = existingSections.includes(section.type);
                return (
                  <button
                    key={section.type}
                    onClick={() => {
                      onAdd(section.type);
                      onClose();
                    }}
                    disabled={exists && section.type !== "custom"}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      exists && section.type !== "custom"
                        ? "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed"
                        : "border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50"
                    }`}
                  >
                    <section.icon
                      className={`w-6 h-6 mb-2 ${
                        exists && section.type !== "custom" ? "text-zinc-300" : "text-indigo-600"
                      }`}
                    />
                    <h4
                      className={`font-medium ${
                        exists && section.type !== "custom" ? "text-zinc-400" : "text-zinc-900"
                      }`}
                    >
                      {section.name}
                    </h4>
                    <p className="text-xs text-zinc-500">{section.description}</p>
                    {exists && section.type !== "custom" && (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs text-zinc-400">
                        <Check className="w-3 h-3" /> Added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

AddSectionModal.displayName = "AddSectionModal";

const PreviewFrame = React.memo(({ url, device }) => {
  const deviceConfig = {
    desktop: { width: "100%", height: "100%", scale: 1 },
    tablet: { width: "768px", height: "100%", scale: 0.75 },
    mobile: { width: "375px", height: "100%", scale: 0.5 },
  };

  const config = deviceConfig[device];

  return (
    <div className="flex-1 bg-zinc-100 rounded-xl overflow-hidden flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          width: config.width,
          height: config.height,
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="Website Preview"
        />
      </div>
    </div>
  );
});

PreviewFrame.displayName = "PreviewFrame";

export default function WebsiteEditor() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [showAddSection, setShowAddSection] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const schools = await base44.entities.School.filter({ created_by: currentUser.email });
        if (schools.length > 0) {
          setSchool(schools[0]);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    };
    loadData();
  }, []);

  const {
    data: website,
    refetch: refetchWebsite,
    isLoading: loadingWebsite,
  } = useQuery({
    queryKey: ["website", school?.id],
    queryFn: async () => {
      if (!school) return null;
      const sites = await base44.entities.Website.filter({ school_id: school.id });
      return sites[0] || null;
    },
    enabled: !!school,
  });

  const { data: sections = [], refetch: refetchSections } = useQuery({
    queryKey: ["websiteSections", school?.id],
    queryFn: async () => {
      if (!school) return [];
      return await base44.entities.WebsiteSection.filter({ school_id: school.id }, "order_index");
    },
    enabled: !!school,
  });

  const { data: translations = [], refetch: refetchTranslations } = useQuery({
    queryKey: ["translations", website?.id],
    queryFn: async () => {
      if (!website) return [];
      return await base44.entities.WebsiteTranslation.filter({ website_id: website.id });
    },
    enabled: !!website,
  });

  const createWebsiteMutation = useMutation({
    mutationFn: (data) => base44.entities.Website.create(data),
    onSuccess: () => {
      refetchWebsite();
      toast.success("Website created successfully!");
    },
    onError: () => {
      toast.error("Failed to create website");
    },
  });

  const updateWebsiteMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.Website.update(id, data),
    onSuccess: () => {
      refetchWebsite();
      toast.success("Website updated!");
    },
    onError: () => {
      toast.error("Failed to update website");
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: (data) => base44.entities.WebsiteSection.create(data),
    onSuccess: () => {
      refetchSections();
      toast.success("Section created!");
    },
    onError: () => {
      toast.error("Failed to create section");
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.WebsiteSection.update(id, data),
    onSuccess: () => {
      refetchSections();
      toast.success("Section updated!");
    },
    onError: () => {
      toast.error("Failed to update section");
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => base44.entities.WebsiteSection.delete(id),
    onSuccess: () => {
      refetchSections();
      toast.success("Section deleted!");
    },
    onError: () => {
      toast.error("Failed to delete section");
    },
  });

  const handleInitializeWebsite = useCallback(async () => {
    if (!school) return;

    const websiteData = {
      school_id: school.id,
      subdomain: school.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      theme: "modern",
      primary_color: "#4f46e5",
      secondary_color: "#7c3aed",
      accent_color: "#10b981",
      font_family: "inter",
      is_published: false,
      enabled_languages: ["en"],
      default_language: "en",
      meta_title: school.name,
      meta_description: `Professional driving lessons at ${school.name}. Learn to drive with confidence.`,
    };

    const newWebsite = await createWebsiteMutation.mutateAsync(websiteData);

    const defaultSections = [
      {
        website_id: newWebsite.id,
        school_id: school.id,
        section_type: "hero",
        title: `Welcome to ${school.name}`,
        content:
          "Learn to drive with confidence. Professional instructors, modern vehicles, and flexible scheduling to fit your lifestyle.",
        cta_text: "Book Your First Lesson",
        cta_url: "#booking",
        order_index: 0,
        is_visible: true,
      },
      {
        website_id: newWebsite.id,
        school_id: school.id,
        section_type: "about",
        title: "About Our School",
        content:
          "We are a premier driving school dedicated to helping you become a safe and confident driver. With years of experience and a commitment to excellence, we provide personalized instruction tailored to your needs.",
        order_index: 1,
        is_visible: true,
      },
      {
        website_id: newWebsite.id,
        school_id: school.id,
        section_type: "services",
        title: "Our Lesson Packages",
        subtitle: "Choose the package that's right for you",
        order_index: 2,
        is_visible: true,
      },
      {
        website_id: newWebsite.id,
        school_id: school.id,
        section_type: "instructors",
        title: "Meet Our Instructors",
        subtitle: "Experienced and patient professionals",
        order_index: 3,
        is_visible: true,
      },
      {
        website_id: newWebsite.id,
        school_id: school.id,
        section_type: "testimonials",
        title: "What Our Students Say",
        subtitle: "Real reviews from real students",
        order_index: 4,
        is_visible: true,
      },
      {
        website_id: newWebsite.id,
        school_id: school.id,
        section_type: "contact",
        title: "Get In Touch",
        content: "Have questions? We're here to help you start your driving journey.",
        order_index: 5,
        is_visible: true,
      },
    ];

    for (const section of defaultSections) {
      await createSectionMutation.mutateAsync(section);
    }
  }, [school, createWebsiteMutation, createSectionMutation]);

  const handleUpdateWebsite = useCallback(
    (data) => {
      if (!website) return;
      updateWebsiteMutation.mutate({ id: website.id, data });
    },
    [website, updateWebsiteMutation]
  );

  const handlePublishToggle = useCallback(() => {
    if (!website) return;
    updateWebsiteMutation.mutate({
      id: website.id,
      data: { is_published: !website.is_published },
    });
  }, [website, updateWebsiteMutation]);

  const handleAddSection = useCallback(
    async (type) => {
      if (!website || !school) return;

      const maxOrder = sections.reduce((max, s) => Math.max(max, s.order_index), -1);

      await createSectionMutation.mutateAsync({
        website_id: website.id,
        school_id: school.id,
        section_type: type,
        title: SECTION_TYPES.find((s) => s.type === type)?.name || "New Section",
        order_index: maxOrder + 1,
        is_visible: true,
      });
    },
    [website, school, sections, createSectionMutation]
  );

  const handleUpdateSection = useCallback(
    (id, data) => {
      updateSectionMutation.mutate({ id, data });
    },
    [updateSectionMutation]
  );

  const handleDeleteSection = useCallback(
    (id) => {
      if (window.confirm("Are you sure you want to delete this section?")) {
        deleteSectionMutation.mutate(id);
      }
    },
    [deleteSectionMutation]
  );

  const handleMoveSection = useCallback(
    (sectionId, direction) => {
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return;

      const currentSection = sections[index];
      const swapSection = sections[newIndex];

      updateSectionMutation.mutate({
        id: currentSection.id,
        data: { order_index: swapSection.order_index },
      });
      updateSectionMutation.mutate({
        id: swapSection.id,
        data: { order_index: currentSection.order_index },
      });
    },
    [sections, updateSectionMutation]
  );

  const handleCopyUrl = useCallback(() => {
    if (!website) return;
    const url = `${window.location.origin}/SchoolWebsite?school=${school?.id}`;
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setUrlCopied(false), 2000);
  }, [website, school]);

  const previewUrl = useMemo(() => {
    if (!school) return "";
    return `/SchoolWebsite?school=${school.id}`;
  }, [school]);

  const existingSectionTypes = useMemo(
    () => sections.map((s) => s.section_type),
    [sections]
  );

  if (!school || loadingWebsite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-zinc-200 bg-white shadow-sm p-12 text-center"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-4">Create Your Website</h1>
          <p className="text-zinc-600 mb-8 max-w-lg mx-auto">
            Get a professional website for your driving school in seconds. Customize the design,
            add your content, and publish when you're ready.
          </p>
          <button
            onClick={handleInitializeWebsite}
            disabled={createWebsiteMutation.isPending}
            className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {createWebsiteMutation.isPending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create My Website
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Website Editor</h1>
          <p className="text-zinc-600 mt-1">Customize your driving school's website</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyUrl}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-2"
          >
            {urlCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            Copy URL
          </button>

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Preview
          </a>

          <button
            onClick={handlePublishToggle}
            className={`px-5 py-2.5 rounded-xl font-semibold transition flex items-center gap-2 ${
              website.is_published
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {website.is_published ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Published
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Publish Website
              </>
            )}
          </button>
        </div>
      </motion.header>

      <div className="flex flex-col lg:flex-row gap-6">
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-64 flex-shrink-0"
        >
          <nav className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition ${
                  activeTab === tab.id
                    ? "bg-indigo-50 border-l-4 border-indigo-600"
                    : "hover:bg-zinc-50 border-l-4 border-transparent"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${activeTab === tab.id ? "text-indigo-600" : "text-zinc-400"}`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      activeTab === tab.id ? "text-indigo-600" : "text-zinc-700"
                    }`}
                  >
                    {tab.label}
                  </p>
                  <p className="text-xs text-zinc-500 hidden xl:block">{tab.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-w-0"
        >
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Brand Assets" icon={ImageIcon} description="Logo and favicon">
                  <div className="grid md:grid-cols-2 gap-6">
                    <ImageUploader
                      label="Logo"
                      description="Recommended: 200x60px, PNG or SVG"
                      value={website.logo_url}
                      onChange={(url) => handleUpdateWebsite({ logo_url: url })}
                      aspectRatio="3/1"
                    />
                    <ImageUploader
                      label="Favicon"
                      description="32x32px, ICO or PNG"
                      value={website.favicon_url}
                      onChange={(url) => handleUpdateWebsite({ favicon_url: url })}
                      aspectRatio="1/1"
                    />
                  </div>
                </Card>

                <Card title="Social Media Links" icon={Share2} description="Connect your social profiles">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField label="Facebook">
                      <div className="relative">
                        <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input
                          value={website.social_facebook || ""}
                          onChange={(e) => handleUpdateWebsite({ social_facebook: e.target.value })}
                          placeholder="https://facebook.com/yourpage"
                          className="pl-11"
                        />
                      </div>
                    </FormField>
                    <FormField label="Instagram">
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input
                          value={website.social_instagram || ""}
                          onChange={(e) => handleUpdateWebsite({ social_instagram: e.target.value })}
                          placeholder="https://instagram.com/yourprofile"
                          className="pl-11"
                        />
                      </div>
                    </FormField>
                    <FormField label="Twitter / X">
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input
                          value={website.social_twitter || ""}
                          onChange={(e) => handleUpdateWebsite({ social_twitter: e.target.value })}
                          placeholder="https://twitter.com/yourhandle"
                          className="pl-11"
                        />
                      </div>
                    </FormField>
                    <FormField label="YouTube">
                      <div className="relative">
                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input
                          value={website.social_youtube || ""}
                          onChange={(e) => handleUpdateWebsite({ social_youtube: e.target.value })}
                          placeholder="https://youtube.com/@yourchannel"
                          className="pl-11"
                        />
                      </div>
                    </FormField>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "sections" && (
              <motion.div
                key="sections"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Page Sections</h2>
                    <p className="text-sm text-zinc-500">
                      Drag to reorder, click to edit
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddSection(true)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Section
                  </button>
                </div>

                <div className="space-y-3">
                  {sections
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((section, index) => (
                      <SectionEditor
                        key={section.id}
                        section={section}
                        onUpdate={(data) => handleUpdateSection(section.id, data)}
                        onDelete={() => handleDeleteSection(section.id)}
                        onMoveUp={() => handleMoveSection(section.id, "up")}
                        onMoveDown={() => handleMoveSection(section.id, "down")}
                        isFirst={index === 0}
                        isLast={index === sections.length - 1}
                      />
                    ))}
                </div>

                {sections.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center">
                    <LayoutIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-zinc-900 mb-2">No sections yet</h3>
                    <p className="text-zinc-500 mb-4">
                      Add sections to build your website content
                    </p>
                    <button
                      onClick={() => setShowAddSection(true)}
                      className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
                    >
                      Add First Section
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "design" && (
              <motion.div
                key="design"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Theme" icon={Palette} description="Choose a design style">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleUpdateWebsite({ theme: theme.id })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          website.theme === theme.id
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-zinc-200 hover:border-indigo-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg mb-3 ${
                            theme.id === "modern"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-500"
                              : theme.id === "elegant"
                              ? "bg-amber-600"
                              : theme.id === "bold"
                              ? "bg-zinc-900"
                              : theme.id === "minimal"
                              ? "bg-zinc-100 border border-zinc-200"
                              : theme.id === "professional"
                              ? "bg-blue-600"
                              : "bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500"
                          }`}
                        />
                        <h4 className="font-medium text-zinc-900">{theme.name}</h4>
                        <p className="text-xs text-zinc-500">{theme.description}</p>
                        {website.theme === theme.id && (
                          <Check className="absolute top-3 right-3 w-5 h-5 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="Colors" icon={Palette} description="Customize your brand colors">
                  <div className="grid md:grid-cols-3 gap-6">
                    <ColorPicker
                      label="Primary Color"
                      value={website.primary_color}
                      onChange={(color) => handleUpdateWebsite({ primary_color: color })}
                    />
                    <ColorPicker
                      label="Secondary Color"
                      value={website.secondary_color}
                      onChange={(color) => handleUpdateWebsite({ secondary_color: color })}
                    />
                    <ColorPicker
                      label="Accent Color"
                      value={website.accent_color || "#10b981"}
                      onChange={(color) => handleUpdateWebsite({ accent_color: color })}
                    />
                  </div>
                </Card>

                <Card title="Typography" icon={Type} description="Choose your fonts">
                  <FormField label="Font Family">
                    <Select
                      value={website.font_family || "inter"}
                      onChange={(value) => handleUpdateWebsite({ font_family: value })}
                      options={FONT_FAMILIES.map((f) => ({ value: f.id, label: f.name }))}
                    />
                  </FormField>
                </Card>
              </motion.div>
            )}

            {activeTab === "seo" && (
              <motion.div
                key="seo"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Meta Tags" icon={Search} description="Optimize for search engines">
                  <div className="space-y-5">
                    <FormField
                      label="Meta Title"
                      description="Appears in browser tabs and search results (50-60 characters)"
                    >
                      <Input
                        value={website.meta_title || ""}
                        onChange={(e) => handleUpdateWebsite({ meta_title: e.target.value })}
                        placeholder={school?.name}
                      />
                      <div className="flex justify-end mt-1">
                        <span
                          className={`text-xs ${
                            (website.meta_title?.length || 0) > 60 ? "text-red-500" : "text-zinc-400"
                          }`}
                        >
                          {website.meta_title?.length || 0}/60
                        </span>
                      </div>
                    </FormField>

                    <FormField
                      label="Meta Description"
                      description="Brief summary for search results (150-160 characters)"
                    >
                      <Textarea
                        value={website.meta_description || ""}
                        onChange={(e) => handleUpdateWebsite({ meta_description: e.target.value })}
                        placeholder="Professional driving lessons at our school..."
                        rows={3}
                      />
                      <div className="flex justify-end mt-1">
                        <span
                          className={`text-xs ${
                            (website.meta_description?.length || 0) > 160 ? "text-red-500" : "text-zinc-400"
                          }`}
                        >
                          {website.meta_description?.length || 0}/160
                        </span>
                      </div>
                    </FormField>

                    <FormField label="Keywords" description="Comma-separated keywords">
                      <Input
                        value={website.meta_keywords || ""}
                        onChange={(e) => handleUpdateWebsite({ meta_keywords: e.target.value })}
                        placeholder="driving school, driving lessons, learn to drive"
                      />
                    </FormField>
                  </div>
                </Card>

                <Card title="Social Sharing" icon={Share2} description="Open Graph image">
                  <ImageUploader
                    label="OG Image"
                    description="Image shown when sharing on social media (1200x630px)"
                    value={website.og_image_url}
                    onChange={(url) => handleUpdateWebsite({ og_image_url: url })}
                    aspectRatio="1200/630"
                  />
                </Card>
              </motion.div>
            )}

            {activeTab === "languages" && (
              <motion.div
                key="languages"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Language Settings" icon={Languages} description="Configure multi-language support">
                  <div className="space-y-6">
                    <FormField label="Default Language">
                      <Select
                        value={website.default_language || "en"}
                        onChange={(value) => handleUpdateWebsite({ default_language: value })}
                        options={LANGUAGES.map((l) => ({ value: l.code, label: `${l.flag} ${l.name}` }))}
                      />
                    </FormField>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-3">
                        Enabled Languages
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {LANGUAGES.map((lang) => {
                          const isEnabled = website.enabled_languages?.includes(lang.code);
                          return (
                            <button
                              key={lang.code}
                              onClick={() => {
                                const newLanguages = isEnabled
                                  ? website.enabled_languages?.filter((l) => l !== lang.code) || []
                                  : [...(website.enabled_languages || []), lang.code];
                                handleUpdateWebsite({ enabled_languages: newLanguages });
                              }}
                              className={`p-3 rounded-xl border-2 text-left transition ${
                                isEnabled
                                  ? "border-indigo-600 bg-indigo-50"
                                  : "border-zinc-200 hover:border-indigo-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{lang.flag}</span>
                                <span className="font-medium text-zinc-900">{lang.name}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Google Analytics" icon={BarChart3} description="Track website visitors">
                  <FormField
                    label="Measurement ID"
                    description="Format: G-XXXXXXXXXX"
                  >
                    <Input
                      value={website.google_analytics_id || ""}
                      onChange={(e) => handleUpdateWebsite({ google_analytics_id: e.target.value })}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </FormField>
                </Card>

                <Card title="Facebook Pixel" icon={Facebook} description="Track conversions from Facebook ads">
                  <FormField label="Pixel ID" description="15-16 digit number">
                    <Input
                      value={website.facebook_pixel_id || ""}
                      onChange={(e) => handleUpdateWebsite({ facebook_pixel_id: e.target.value })}
                      placeholder="123456789012345"
                    />
                  </FormField>
                </Card>
              </motion.div>
            )}

            {activeTab === "domain" && (
              <motion.div
                key="domain"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Subdomain" icon={Globe} description="Your free website address">
                  <FormField label="Subdomain" description="This creates your unique website URL">
                    <div className="flex items-center gap-2">
                      <Input
                        value={website.subdomain}
                        onChange={(e) =>
                          handleUpdateWebsite({
                            subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                          })
                        }
                        placeholder="your-school-name"
                      />
                      <span className="text-zinc-500 whitespace-nowrap">.drivepro.app</span>
                    </div>
                  </FormField>
                </Card>

                <Card
                  title="Custom Domain"
                  icon={LinkIcon}
                  description="Use your own domain name"
                  actions={
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Pro Feature
                    </span>
                  }
                >
                  <FormField
                    label="Custom Domain"
                    description="Point your domain's DNS to our servers"
                  >
                    <Input
                      value={website.custom_domain || ""}
                      onChange={(e) => handleUpdateWebsite({ custom_domain: e.target.value })}
                      placeholder="www.yourschool.com"
                    />
                  </FormField>
                </Card>
              </motion.div>
            )}

            {activeTab === "advanced" && (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <Card title="Custom CSS" icon={Code} description="Add custom styles">
                  <FormField label="CSS Code" description="Applied to all pages">
                    <Textarea
                      value={website.custom_css || ""}
                      onChange={(e) => handleUpdateWebsite({ custom_css: e.target.value })}
                      placeholder="/* Your custom CSS */"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </FormField>
                </Card>

                <Card title="Custom Scripts" icon={Code} description="Add tracking or custom JavaScript">
                  <div className="space-y-5">
                    <FormField label="Head Scripts" description="Placed in the <head> section">
                      <Textarea
                        value={website.custom_head_scripts || ""}
                        onChange={(e) => handleUpdateWebsite({ custom_head_scripts: e.target.value })}
                        placeholder="<!-- Head scripts -->"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </FormField>

                    <FormField label="Body Scripts" description="Placed before </body>">
                      <Textarea
                        value={website.custom_body_scripts || ""}
                        onChange={(e) => handleUpdateWebsite({ custom_body_scripts: e.target.value })}
                        placeholder="<!-- Body scripts -->"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </FormField>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.main>
      </div>

      <AddSectionModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onAdd={handleAddSection}
        existingSections={existingSectionTypes}
      />
    </div>
  );
}