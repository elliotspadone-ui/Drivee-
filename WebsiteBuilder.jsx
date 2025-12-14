import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Globe, Eye, Edit, Palette, Layout, Settings, ExternalLink } from "lucide-react";

export default function WebsiteBuilder() {
  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: () => base44.entities.Website.list()
  });

  const website = websites[0];

  const features = [
    { name: "Homepage", icon: Layout, status: "Live", color: "text-[#5cb83a]" },
    { name: "About Us", icon: Edit, status: "Draft", color: "text-[#e7d356]" },
    { name: "Services", icon: Palette, status: "Live", color: "text-[#5cb83a]" },
    { name: "Contact", icon: Settings, status: "Live", color: "text-[#5cb83a]" }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Website Builder</h1>
          <p className="text-slate-600 mt-1">Create and manage your school's website</p>
        </div>
        <Link to={createPageUrl("SchoolWebsite")}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Site
          </motion.button>
        </Link>
      </div>

      <div className="bg-gradient-to-br from-[#e8f4fa] to-white rounded-2xl p-8 border border-[#d4eaf5]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-2xl flex items-center justify-center shadow-lg">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Your Website</h2>
            <p className="text-slate-600">Attract more students with a professional online presence</p>
          </div>
        </div>

        {website && (
          <a
            href={website.domain || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-semibold text-[#3b82c4] transition"
          >
            <ExternalLink className="w-4 h-4" />
            {website.domain || "yourschool.drivee.eu"}
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, idx) => (
          <motion.div
            key={feature.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{feature.name}</h3>
                  <p className={`text-sm font-semibold ${feature.color}`}>{feature.status}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                <Edit className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}