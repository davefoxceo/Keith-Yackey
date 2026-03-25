"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Square, Paperclip, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendWithImage?: (message: string, imageFile: File) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onSendWithImage,
  onStop,
  isStreaming = false,
  placeholder = "Talk to Coach Keith...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image must be under 5MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && !imageFile) || isStreaming) return;

    if (imageFile && onSendWithImage) {
      onSendWithImage(trimmed || "(image)", imageFile);
    } else if (trimmed) {
      onSend(trimmed);
    }

    setValue("");
    removeImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = value.trim() || imageFile;

  return (
    <div className="border-t border-slate-800 bg-surface-raised/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
              <Image
                src={imagePreview}
                alt="Attachment preview"
                fill
                className="object-cover"
              />
            </div>
            <button
              onClick={removeImage}
              className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-800/50 p-2 focus-within:border-amber-500/40 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none px-2 py-1.5 max-h-40"
          />

          <div className="flex items-center gap-1 shrink-0">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                imageFile
                  ? "text-amber-400 bg-amber-500/15"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
              )}
              title="Attach image"
            >
              <Paperclip className="w-4 h-4" />
            </motion.button>

            {isStreaming ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={onStop}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors"
              >
                <Square className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                  canSend
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/20"
                    : "bg-slate-700/50 text-slate-500"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Coach Keith AI provides guidance based on Keith Yackey&apos;s teachings.
          Not a substitute for professional therapy.
        </p>
      </div>
    </div>
  );
}
