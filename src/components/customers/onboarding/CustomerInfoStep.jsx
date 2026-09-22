// src/components/customers/onboarding/CustomerInfoStep.jsx

import {
  User,
  Phone,
  MapPin,
  BriefcaseBusiness,
  Camera,
  Upload,
  X,
} from "lucide-react";

const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        const scale = Math.min(maxWidth / width, maxHeight / height, 1);

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const CustomerInfoStep = ({
  data = {},
  photo = {},
  onChange,
  onPhotoChange,
}) => {
  const handleChange = (
    field,
    value
  ) => {
    onChange({
      [field]: value,
    });
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !file.type.startsWith("image/")) return;

    compressImage(file)
      .then((fileData) => {
        onPhotoChange?.({
          fileName: file.name,
          fileType: "image/jpeg",
          fileSize: Math.round((fileData.length * 3) / 4),
          fileData,
          uploadedAt: new Date().toISOString(),
        });
      })
      .catch((error) => {
        console.error("Failed to compress customer photo:", error);
      });
  };

  const removePhoto = () => {
    onPhotoChange?.({ fileName: "", fileType: "", fileSize: 0, fileData: "", uploadedAt: "" });
  };

  const hasPhoto = Boolean(photo?.fileData);

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF5EF]">
            <User
              size={16}
              className="text-[#0B5D3B]"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#17221D]">
              Customer Information
            </h2>

            <p className="text-[11px] text-slate-400">
              Basic customer and contact details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* DATE */}
          <FormField label="Date">
            <input
              type="date"
              value={data.date || ""}
              readOnly
              className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
            />
          </FormField>

          {/* CUSTOMER NAME */}
          <FormField
            label="Customer Name"
            required
          >
            <input
              type="text"
              placeholder="Enter full name"
              value={data.name || ""}
              onChange={(e) =>
                handleChange(
                  "name",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </FormField>

          {/* MOBILE */}
          <FormField
            label="Mobile Number"
            required
          >
            <div className="relative">
              <Phone
                size={15}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile"
                value={
                  data.mobileNumber || ""
                }
                maxLength={10}
                onChange={(e) =>
                  handleChange(
                    "mobileNumber",
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                className={`${inputClass} pl-9`}
              />
            </div>
          </FormField>

          {/* PROFESSION */}
          <FormField
            label="Profession"
            required
          >
            <div className="relative">
              <BriefcaseBusiness
                size={15}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="text"
                placeholder="Profession"
                value={
                  data.profession || ""
                }
                onChange={(e) =>
                  handleChange(
                    "profession",
                    e.target.value
                  )
                }
                className={`${inputClass} pl-9`}
              />
            </div>
          </FormField>

          {/* OWN HOUSE */}
          <FormField
            label="Own House"
            required
          >
            <div className="flex h-[38px] gap-2">
              <ChoiceButton
                label="Yes"
                active={
                  data.ownHouse ===
                  true
                }
                onClick={() =>
                  handleChange(
                    "ownHouse",
                    true
                  )
                }
              />

              <ChoiceButton
                label="No"
                active={
                  data.ownHouse ===
                  false
                }
                onClick={() =>
                  handleChange(
                    "ownHouse",
                    false
                  )
                }
              />
            </div>
          </FormField>

          {/* ADDRESS */}
          <div className="lg:col-span-4">
            <FormField
              label="Address"
              required
            >
              <div className="relative">
                <MapPin
                  size={15}
                  className="
                    absolute
                    left-3
                    top-3
                    text-slate-400
                  "
                />

                <textarea
                  rows={2}
                  placeholder="Enter complete residential address"
                  value={
                    data.address || ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "address",
                      e.target.value
                    )
                  }
                  className={`${inputClass} min-h-[58px] resize-none pl-9`}
                />
              </div>
            </FormField>
          </div>

          {/* AREA */}
          <FormField label="Area">
            <input
              type="text"
              placeholder="Area"
              value={data.area || ""}
              onChange={(e) =>
                handleChange(
                  "area",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </FormField>

          {/* LANDMARK */}
          <FormField label="Landmark">
            <input
              type="text"
              placeholder="Landmark"
              value={
                data.landmark || ""
              }
              onChange={(e) =>
                handleChange(
                  "landmark",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </FormField>

          {/* PINCODE */}
          <FormField
            label="Pincode"
            required
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit pincode"
              value={
                data.pincode || ""
              }
              onChange={(e) =>
                handleChange(
                  "pincode",
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              className={inputClass}
            />
          </FormField>

          {/* REFERRED BY */}
          <FormField label="Referred By">
            <input
              type="text"
              placeholder="Referral name"
              value={
                data.referredBy || ""
              }
              onChange={(e) =>
                handleChange(
                  "referredBy",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </FormField>

          {/* CUSTOMER PHOTO */}
          <div className="sm:col-span-2 lg:col-span-4">
            <FormField label="Customer Photo">
              {hasPhoto ? (
                <div className="rounded-lg border border-[#D8E9DF] bg-[#F6FBF8] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#CDE1D5] bg-white">
                      <img src={photo.fileData} alt="Customer" className="h-full w-full object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Camera size={14} className="shrink-0 text-[#0B5D3B]" />

                        <p className="truncate text-xs font-semibold text-[#0B5D3B]" title={photo.fileName}>
                          {photo.fileName || "Customer Photo"}
                        </p>
                      </div>

                      {photo.fileSize > 0 && (
                        <p className="mt-1 text-[10px] text-slate-400">{formatFileSize(photo.fileSize)}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={removePhoto}
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex min-h-[76px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 transition hover:border-[#0B5D3B] hover:bg-[#F6FBF8]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF5EF]">
                      <Camera size={18} className="text-[#0B5D3B]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Upload size={13} className="text-[#0B5D3B]" />
                        <span className="text-xs font-semibold text-[#0B5D3B]">Upload Customer Photo</span>
                      </div>

                      <p className="mt-0.5 text-[10px] text-slate-400">JPG, JPEG, PNG or WEBP</p>
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </FormField>
          </div>
        </div>
      </section>
    </div>
  );
};

const FormField = ({
  label,
  required = false,
  children,
}) => (
  <div className="min-w-0">
    <label className="mb-1 block text-[11px] font-medium text-slate-600">
      {label}

      {required && (
        <span className="ml-0.5 text-red-500">
          *
        </span>
      )}
    </label>

    {children}
  </div>
);

const ChoiceButton = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      flex
      h-full
      flex-1
      items-center
      justify-center
      rounded-md
      border
      text-xs
      font-medium
      transition

      ${
        active
          ? "border-[#0B5D3B] bg-[#EAF5EF] text-[#0B5D3B]"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
      }
    `}
  >
    {label}
  </button>
);

const inputClass = `
  h-[38px]
  w-full
  rounded-md
  border
  border-slate-200
  bg-white
  px-3
  text-xs
  text-slate-700
  placeholder:text-slate-400
  outline-none
  transition
  focus:border-[#0B5D3B]
  focus:ring-1
  focus:ring-[#0B5D3B]
`;

export default CustomerInfoStep;