"use client";

import React, { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { PublicMenuCategory, PublicMenuItem } from "@/lib/menu/types";
import { FORM_INPUT_CLASS } from "../_lib/menu-ui";

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#A39C91] uppercase tracking-wider mb-1.5 block">
        {label}
        {required && <span className="text-[#B55234] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
        checked ? "bg-[#B55234]" : "bg-[#D4CFC6]"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function AddMenuItemPanel({
  editingItem,
  categories,
  currency,
  saving,
  serverError,
  onSave,
  onClose,
}: {
  editingItem: PublicMenuItem | null;
  categories: PublicMenuCategory[];
  currency: string;
  saving?: boolean;
  /** Last server error; shown under the field it names. */
  serverError: { field: string | null; message: string } | null;
  onSave: (input: {
    categoryId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: string;
    isAvailable: boolean;
    isFeatured: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [categoryId, setCategoryId] = useState(editingItem?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(editingItem?.description ?? "");
  const [price, setPrice] = useState(editingItem?.price ?? "");
  const [isAvailable, setIsAvailable] = useState(editingItem?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(editingItem?.isFeatured ?? false);
  const [imageUrl, setImageUrl] = useState(editingItem?.imageUrl ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A local message wins; otherwise show the server's message under the field it names.
  const errorFor = (field: string) =>
    errors[field] ?? (serverError?.field === field && Object.keys(errors).length === 0 ? serverError.message : null);
  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Item name must have at least 2 characters.";
    if (!categoryId) found.categoryId = "Choose a category.";
    if (!/^\d+([.,]\d+)?$/.test(price.trim())) found.price = "Enter a price such as 18.500.";
    if (imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim())) {
      found.imageUrl = "The image link must start with http:// or https://.";
    }
    return found;
  }

  return (
    <div className="lg:w-[320px] xl:w-[340px] shrink-0 border-l border-[#E8E2D7] bg-white ml-0 lg:ml-4 mt-4 lg:mt-0 rounded-xl lg:rounded-none lg:rounded-r-xl p-5 animate-in slide-in-from-right-4 duration-300 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-[#1A1A1A]">
          {editingItem ? "Edit menu item" : "Add menu item"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#F5F0E8] flex items-center justify-center text-[#A39C91] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <FormField label="Item name" required error={errorFor("name")}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            placeholder="e.g. Truffle Pasta"
            className={FORM_INPUT_CLASS}
          />
        </FormField>

        <FormField label="Category" required error={errorFor("categoryId")}>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                clearError("categoryId");
              }}
              className={`${FORM_INPUT_CLASS} appearance-none pr-8 cursor-pointer`}
            >
              <option value="">Select category</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39C91] pointer-events-none" />
          </div>
        </FormField>

        <FormField label="Description" error={errorFor("description")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ingredients and special details..."
            rows={3}
            className={`${FORM_INPUT_CLASS} resize-none`}
          />
        </FormField>

        <FormField label="Image URL" error={errorFor("imageUrl")}>
          <input
            type="text"
            inputMode="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              clearError("imageUrl");
            }}
            placeholder="https://…"
            className={FORM_INPUT_CLASS}
          />
        </FormField>

        <FormField label="Price" required error={errorFor("price")}>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                clearError("price");
              }}
              placeholder="0.000"
              className={`${FORM_INPUT_CLASS} pr-14`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A39C91]">
              {currency}
            </span>
          </div>
        </FormField>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#A39C91]" />
            <span className="text-sm font-medium text-[#1A1A1A]">Available</span>
          </div>
          <ToggleSwitch checked={isAvailable} onChange={setIsAvailable} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#1A1A1A]">Featured</span>
          <ToggleSwitch checked={isFeatured} onChange={setIsFeatured} />
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6">
        <button
          type="button"
          onClick={() => {
            const found = validate();
            setErrors(found);
            if (Object.keys(found).length > 0) return;
            onSave({
              categoryId,
              name: name.trim(),
              description: description.trim() || undefined,
              imageUrl: imageUrl.trim() || undefined,
              price: price.trim(),
              isAvailable,
              isFeatured,
            });
          }}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] disabled:bg-[#D4CFC6] disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
        >
          {saving ? "Saving…" : editingItem ? "Update item" : "Save item"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#F5F0E8] hover:bg-[#E8E2D7] text-[#1A1A1A] text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
