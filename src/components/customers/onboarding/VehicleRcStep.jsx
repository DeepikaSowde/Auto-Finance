// src/components/customers/onboarding/VehicleRcStep.jsx

import { useState } from "react";

import {
  Car,
  FileText,
  ShieldCheck,
  Upload,
  X,
  Check,
  Camera,
} from "lucide-react";

const VehicleRcStep = ({
  data = {},
  onChange,
}) => {
  const vehicle =
    data.vehicle || {};

  const rc =
    data.rc || {};

  const insurance =
    rc.insurance || {};

  const endorsement =
    rc.endorsement || {};

  const [
    activeTab,
    setActiveTab,
  ] = useState("vehicle");

  const isCommercialVehicle =
    vehicle.vehicleType ===
    "Commercial Vehicle";

  const updateVehicle = (
    field,
    value
  ) => {
    onChange({
      ...data,

      vehicle: {
        ...vehicle,
        [field]: value,
      },
    });
  };

  const vehiclePhoto = vehicle.photo || {};

  const handleVehiclePhotoUpload = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !file.type.startsWith("image/")) return;

    fileToDataUrl(file)
      .then((fileData) => {
        updateVehicle("photo", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData,
          uploadedAt: new Date().toISOString(),
        });
      })
      .catch((error) => {
        console.error("Vehicle photo upload failed:", error);
      });
  };

  const removeVehiclePhoto = () => {
    updateVehicle("photo", { fileName: "", fileType: "", fileSize: 0, fileData: "", uploadedAt: "" });
  };

  const updateRc = (
    field,
    value
  ) => {
    onChange({
      ...data,

      rc: {
        ...rc,
        [field]: value,
      },
    });
  };

  const updateInsurance = (
    field,
    value
  ) => {
    onChange({
      ...data,

      rc: {
        ...rc,

        insurance: {
          ...insurance,
          [field]: value,
        },
      },
    });
  };

  const updateEndorsement = (
    value
  ) => {
    onChange({
      ...data,

      rc: {
        ...rc,

        endorsement: {
          ...endorsement,
          enabled: value,
        },
      },
    });
  };

  const handleInsuranceUpload = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    fileToDataUrl(file)
      .then((fileData) => {
        onChange({
          ...data,

          rc: {
            ...rc,

            insurance: {
              ...insurance,

              document: {
                fileName:
                  file.name,
                fileType:
                  file.type,
                fileSize:
                  file.size,
                fileData,
                uploadedAt:
                  new Date().toISOString(),
              },
            },
          },
        });
      })
      .catch((error) => {
        console.error(
          "Insurance document upload failed:",
          error
        );
      });
  };

  const removeInsuranceDocument =
    () => {
      onChange({
        ...data,

        rc: {
          ...rc,

          insurance: {
            ...insurance,

            document: {
              fileName: "",
              fileType: "",
              fileSize: 0,
              fileData: "",
              uploadedAt: "",
            },
          },
        },
      });
    };

  const insuranceDocument =
    insurance.document || {};

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* TABS */}
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-1.5">
        <div className="grid grid-cols-3 gap-1">
          <VehicleTab
            icon={Car}
            label="Vehicle Information"
            active={
              activeTab === "vehicle"
            }
            onClick={() =>
              setActiveTab("vehicle")
            }
          />

          <VehicleTab
            icon={FileText}
            label="RC & Registration"
            active={
              activeTab === "rc"
            }
            onClick={() =>
              setActiveTab("rc")
            }
          />

          <VehicleTab
            icon={ShieldCheck}
            label="Compliance & Insurance"
            active={
              activeTab ===
              "compliance"
            }
            onClick={() =>
              setActiveTab(
                "compliance"
              )
            }
          />
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="min-h-0 flex-1">
        {activeTab === "vehicle" && (
          <CompactSection
            icon={Car}
            title="Vehicle Information"
            subtitle="Basic vehicle details"
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Vehicle Type">
                <select
                  value={
                    vehicle.vehicleType ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "vehicleType",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select vehicle type
                  </option>

                  <option value="Two Wheeler">
                    Two Wheeler
                  </option>

                  <option value="Three Wheeler">
                    Three Wheeler
                  </option>

                  <option value="Car">
                    Car
                  </option>

                  <option value="Commercial Vehicle">
                    Commercial Vehicle
                  </option>

                  <option value="Tractor">
                    Tractor
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </FormField>

              <FormField label="Brand">
                <input
                  type="text"
                  placeholder="Brand"
                  value={
                    vehicle.brand ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "brand",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Model">
                <input
                  type="text"
                  placeholder="Model"
                  value={
                    vehicle.model ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "model",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Variant">
                <input
                  type="text"
                  placeholder="Variant"
                  value={
                    vehicle.variant ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "variant",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Colour">
                <input
                  type="text"
                  placeholder="Vehicle colour"
                  value={
                    vehicle.colour ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "colour",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Manufacturing Year">
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="YYYY"
                  value={
                    vehicle.manufacturingYear ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "manufacturingYear",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Fuel Type">
                <select
                  value={
                    vehicle.fuelType ||
                    ""
                  }
                  onChange={(e) =>
                    updateVehicle(
                      "fuelType",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select fuel type
                  </option>

                  <option value="Petrol">
                    Petrol
                  </option>

                  <option value="Diesel">
                    Diesel
                  </option>

                  <option value="Electric">
                    Electric
                  </option>

                  <option value="CNG">
                    CNG
                  </option>

                  <option value="Hybrid">
                    Hybrid
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </FormField>

              <FormField label="Vehicle Value">
                <MoneyInput
                  value={
                    vehicle.vehicleValue
                  }
                  placeholder="Vehicle value"
                  onChange={(value) =>
                    updateVehicle(
                      "vehicleValue",
                      value
                    )
                  }
                />
              </FormField>

              {/* VEHICLE PHOTO */}
              <div className="sm:col-span-2 lg:col-span-4">
                <FormField label="Vehicle / Bike Photo">
                  {vehiclePhoto.fileData ? (
                    <div className="rounded-lg border border-[#D8E9DF] bg-[#F6FBF8] p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[#CDE1D5] bg-white">
                          <img
                            src={vehiclePhoto.fileData}
                            alt="Vehicle"
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Camera size={14} className="shrink-0 text-[#0B5D3B]" />

                            <p
                              className="truncate text-xs font-semibold text-[#0B5D3B]"
                              title={vehiclePhoto.fileName}
                            >
                              {vehiclePhoto.fileName || "Vehicle Photo"}
                            </p>
                          </div>

                          {vehiclePhoto.fileSize > 0 && (
                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatFileSize(vehiclePhoto.fileSize)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={removeVehiclePhoto}
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
                            <span className="text-xs font-semibold text-[#0B5D3B]">Upload Vehicle Photo</span>
                          </div>

                          <p className="mt-0.5 text-[10px] text-slate-400">JPG, JPEG, PNG or WEBP</p>
                        </div>
                      </div>

                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleVehiclePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </FormField>
              </div>
            </div>
          </CompactSection>
        )}

        {activeTab === "rc" && (
          <CompactSection
            icon={FileText}
            title="RC & Registration"
            subtitle="Registration and vehicle identification"
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Registration Number">
                <input
                  type="text"
                  placeholder="TN 00 AB 0000"
                  value={
                    rc.registrationNumber ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "registrationNumber",
                      e.target.value.toUpperCase()
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="RC Book Number">
                <input
                  type="text"
                  placeholder="RC book number"
                  value={
                    rc.rcBookNumber ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "rcBookNumber",
                      e.target.value.toUpperCase()
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="RTO / Registration Location">
                <input
                  type="text"
                  placeholder="RTO / location"
                  value={
                    rc.location ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "location",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Date of Registration">
                <input
                  type="date"
                  value={
                    rc.dateOfRegistration ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "dateOfRegistration",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Chassis Number">
                <input
                  type="text"
                  placeholder="Chassis number"
                  value={
                    rc.chassisNumber ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "chassisNumber",
                      e.target.value.toUpperCase()
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Engine Number">
                <input
                  type="text"
                  placeholder="Engine number"
                  value={
                    rc.engineNumber ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "engineNumber",
                      e.target.value.toUpperCase()
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Existing Financier">
                <select
                  value={
                    rc.existingFinancier ||
                    "None"
                  }
                  onChange={(e) =>
                    updateRc(
                      "existingFinancier",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="None">
                    None
                  </option>

                  <option value="Bank / Financier">
                    Bank / Financier
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </FormField>

              <FormField label="Hypothecation">
                <div className="flex h-[38px] gap-2">
                  <ChoiceButton
                    label="Yes"
                    active={
                      rc.hypothecation ===
                      true
                    }
                    onClick={() =>
                      updateRc(
                        "hypothecation",
                        true
                      )
                    }
                  />

                  <ChoiceButton
                    label="No"
                    active={
                      rc.hypothecation ===
                      false
                    }
                    onClick={() =>
                      updateRc(
                        "hypothecation",
                        false
                      )
                    }
                  />
                </div>
              </FormField>
            </div>
          </CompactSection>
        )}

        {activeTab ===
          "compliance" && (
          <CompactSection
            icon={ShieldCheck}
            title="Compliance & Insurance"
            subtitle="Expiry and insurance information"
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Tax Expiry">
                <input
                  type="date"
                  value={
                    rc.taxExpiry ||
                    ""
                  }
                  onChange={(e) =>
                    updateRc(
                      "taxExpiry",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              {isCommercialVehicle && (
                <FormField label="Permit Expiry">
                  <input
                    type="date"
                    value={
                      rc.permitExpiry ||
                      ""
                    }
                    onChange={(e) =>
                      updateRc(
                        "permitExpiry",
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </FormField>
              )}

              {isCommercialVehicle && (
                <FormField label="FC Expiry">
                  <input
                    type="date"
                    value={
                      rc.fcExpiry ||
                      ""
                    }
                    onChange={(e) =>
                      updateRc(
                        "fcExpiry",
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </FormField>
              )}

              <FormField label="Insurance Company">
                <input
                  type="text"
                  placeholder="Insurance company"
                  value={
                    insurance.companyName ||
                    ""
                  }
                  onChange={(e) =>
                    updateInsurance(
                      "companyName",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Policy Number">
                <input
                  type="text"
                  placeholder="Policy number"
                  value={
                    insurance.policyNumber ||
                    ""
                  }
                  onChange={(e) =>
                    updateInsurance(
                      "policyNumber",
                      e.target.value.toUpperCase()
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Insurance Expiry">
                <input
                  type="date"
                  value={
                    insurance.expiryDate ||
                    ""
                  }
                  onChange={(e) =>
                    updateInsurance(
                      "expiryDate",
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="Financier Endorsement">
                <div className="flex h-[38px] gap-2">
                  <ChoiceButton
                    label="Yes"
                    active={
                      endorsement.enabled ===
                      true
                    }
                    onClick={() =>
                      updateEndorsement(
                        true
                      )
                    }
                  />

                  <ChoiceButton
                    label="No"
                    active={
                      endorsement.enabled ===
                      false
                    }
                    onClick={() =>
                      updateEndorsement(
                        false
                      )
                    }
                  />
                </div>
              </FormField>

              <div className="min-w-0">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Insurance Document
                </label>

                {insuranceDocument.fileName ? (
                  <div className="flex h-[38px] items-center gap-2 rounded-md border border-[#D8E9DF] bg-[#F6FBF8] px-3">
                    <Check
                      size={14}
                      className="shrink-0 text-[#0B5D3B]"
                    />

                    <span
                      className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#0B5D3B]"
                      title={
                        insuranceDocument.fileName
                      }
                    >
                      {
                        insuranceDocument.fileName
                      }
                    </span>

                    <button
                      type="button"
                      onClick={
                        removeInsuranceDocument
                      }
                      className="
                        flex
                        h-6
                        w-6
                        shrink-0
                        items-center
                        justify-center
                        rounded-md
                        text-slate-400
                        hover:bg-red-50
                        hover:text-red-500
                      "
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label
                    className="
                      flex
                      h-[38px]
                      cursor-pointer
                      items-center
                      justify-center
                      gap-1.5
                      rounded-md
                      border
                      border-dashed
                      border-slate-300
                      bg-white
                      text-[10px]
                      font-semibold
                      text-[#0B5D3B]
                      hover:border-[#0B5D3B]
                      hover:bg-[#F6FBF8]
                    "
                  >
                    <Upload size={13} />

                    Upload Insurance Document

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={
                        handleInsuranceUpload
                      }
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Remarks
              </label>

              <textarea
                rows={2}
                placeholder="Add vehicle, RC or insurance remarks..."
                value={
                  rc.remarks || ""
                }
                onChange={(e) =>
                  updateRc(
                    "remarks",
                    e.target.value
                  )
                }
                className="
                  min-h-[58px]
                  w-full
                  resize-none
                  rounded-md
                  border
                  border-slate-200
                  px-3
                  py-2
                  text-xs
                  text-slate-700
                  outline-none
                  focus:border-[#0B5D3B]
                  focus:ring-1
                  focus:ring-[#0B5D3B]
                "
              />
            </div>
          </CompactSection>
        )}
      </div>
    </div>
  );
};

const VehicleTab = ({
  icon: Icon,
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      flex
      min-h-[42px]
      items-center
      justify-center
      gap-2
      rounded-lg
      px-3
      text-[10px]
      font-semibold
      transition

      ${
        active
          ? "bg-[#EAF5EF] text-[#0B5D3B]"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      }
    `}
  >
    <Icon size={14} />

    <span className="hidden sm:block">
      {label}
    </span>
  </button>
);

const CompactSection = ({
  icon: Icon,
  title,
  subtitle,
  children,
}) => (
  <section className="rounded-xl border border-slate-200 bg-white">
    <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF5EF]">
        <Icon
          size={16}
          className="text-[#0B5D3B]"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#17221D]">
          {title}
        </h3>

        <p className="text-[11px] text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>

    <div className="p-4">
      {children}
    </div>
  </section>
);

const FormField = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <label className="mb-1 block text-[11px] font-medium text-slate-600">
      {label}
    </label>

    {children}
  </div>
);

const MoneyInput = ({
  value,
  placeholder,
  onChange,
}) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
      ₹
    </span>

    <input
      type="number"
      min="0"
      step="0.01"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          e.target.value
        )
      }
      className={`${inputClass} pl-7`}
    />
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
      h-[38px]
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

const fileToDataUrl = (
  file
) =>
  new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(
          reader.result
        );

      reader.onerror = () =>
        reject(
          new Error(
            "Unable to read file."
          )
        );

      reader.readAsDataURL(file);
    }
  );

const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default VehicleRcStep;