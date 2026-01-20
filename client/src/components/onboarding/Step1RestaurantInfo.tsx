import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "../OnboardingWizard";

export function Step1RestaurantInfo({ data, onUpdate }: StepProps) {
  const [formData, setFormData] = useState({
    name: data.name || "",
    slug: data.slug || "",
    description: data.description || "",
    address: data.address || "",
    phone: data.phone || "",
    email: data.email || "",
    websiteUrl: data.websiteUrl || "",
    menuUrl: data.menuUrl || "",
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    
    // Auto-generate slug from name
    if (field === "name") {
      updated.slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    
    setFormData(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Restaurant Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Restaurant Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., La Bella Italia"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">
            URL Slug <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">restaurantai.com/</span>
            <Input
              id="slug"
              placeholder="la-bella-italia"
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Tell us about your restaurant..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@restaurant.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="address"
          placeholder="123 Main St, City, State, ZIP"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Website URL */}
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://www.restaurant.com"
            value={formData.websiteUrl}
            onChange={(e) => handleChange("websiteUrl", e.target.value)}
          />
        </div>

        {/* Menu URL */}
        <div className="space-y-2">
          <Label htmlFor="menuUrl">Menu URL</Label>
          <Input
            id="menuUrl"
            type="url"
            placeholder="https://www.restaurant.com/menu"
            value={formData.menuUrl}
            onChange={(e) => handleChange("menuUrl", e.target.value)}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Make sure your phone number and email are correct. We'll use them to
          send important notifications and updates.
        </p>
      </div>
    </div>
  );
}
