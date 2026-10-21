import React, { useState } from "react";
import {
  type HardwareProfile,
  getHardwareProfiles,
  saveHardwareProfile,
  setActiveHardwareProfile,
  deleteHardwareProfile,
  resetHardwareProfilesToDefault,
  exportHardwareProfilesJson,
  importHardwareProfilesJson,
} from "../../utils/hardwareProfile";

export interface GpuPresetOption {
  id: string;
  name: string;
  vramGb: number;
  category: string;
  tdpWatts: number;
  isLaptop?: boolean;
}

interface HardwareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  gpuPresets: GpuPresetOption[];
  currentSpecs?: {
    gpuPresetId: string;
    customGpuVram: number;
    systemRamGb: number;
    displayDeductionMode: "primary_single" | "primary_multi" | "headless";
    laptopTgpWatts?: number;
    tufProfile?: "turbo" | "perf" | "silent" | "overnight" | "custom";
    cpuWatts?: number;
    plnTarifPerKwh?: number;
  };
  onApplyProfile: (profile: HardwareProfile) => void;
  onToast?: (message: string) => void;
}

export const HardwareProfileModal: React.FC<HardwareProfileModalProps> = ({
  isOpen,
  onClose,
  gpuPresets,
  currentSpecs,
  onApplyProfile,
  onToast,
}) => {
  const [profiles, setProfiles] = useState<HardwareProfile[]>(() => getHardwareProfiles());
  const [activeProfileId, setActiveProfileIdState] = useState<string>(() => {
    const list = getHardwareProfiles();
    const def = list.find((p) => p.isDefault) || list[0];
    return def ? def.id : "";
  });

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formDeviceType, setFormDeviceType] = useState<"laptop" | "desktop" | "server" | "custom">("laptop");
  const [formGpuPresetId, setFormGpuPresetId] = useState<string>("rtx4060_laptop");
  const [formCustomVram, setFormCustomVram] = useState<number>(8);
  const [formSystemRam, setFormSystemRam] = useState<number>(32);
  const [formDisplayDeduction, setFormDisplayDeduction] = useState<"primary_single" | "primary_multi" | "headless">("primary_single");
  const [formLaptopTgp, setFormLaptopTgp] = useState<number>(140);
  const [formCpuWatts, setFormCpuWatts] = useState<number>(35);
  const [formPlnTarif, setFormPlnTarif] = useState<number>(1444);
  const [formIsDefault, setFormIsDefault] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState<string>("");

  // Tab mode
  const [activeTab, setActiveTab] = useState<"list" | "form" | "storage">("list");
  const [jsonInput, setJsonInput] = useState<string>("");
  const [showJsonImport, setShowJsonImport] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const handleApply = (profile: HardwareProfile) => {
    setActiveHardwareProfile(profile.id, profile.isDefault);
    setActiveProfileIdState(profile.id);
    onApplyProfile(profile);
    if (onToast) onToast(`Profil '${profile.name}' berhasil diterapkan!`);
    onClose();
  };

  const handleSetDefault = (profile: HardwareProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = setActiveHardwareProfile(profile.id, true);
    if (updated) {
      setProfiles(getHardwareProfiles());
      setActiveProfileIdState(profile.id);
      onApplyProfile(profile);
      if (onToast) onToast(`'${profile.name}' sekarang menjadi profil default.`);
    }
  };

  const handleSaveCurrentAsProfile = () => {
    if (!currentSpecs) return;
    const currentGpu = gpuPresets.find((g) => g.id === currentSpecs.gpuPresetId);
    const newProfile: HardwareProfile = {
      id: `profile_${Date.now()}`,
      name: `Spek Aktif (${currentGpu ? currentGpu.name.split("(")[0].trim() : "Custom"} · ${currentSpecs.systemRamGb}GB)`,
      deviceType: currentGpu?.isLaptop ? "laptop" : "desktop",
      gpuPresetId: currentSpecs.gpuPresetId,
      customGpuVram: currentSpecs.customGpuVram,
      systemRamGb: currentSpecs.systemRamGb,
      displayDeductionMode: currentSpecs.displayDeductionMode,
      isLaptop: currentGpu?.isLaptop,
      laptopTgpWatts: currentSpecs.laptopTgpWatts || 140,
      tufProfile: currentSpecs.tufProfile || "perf",
      cpuWatts: currentSpecs.cpuWatts || 35,
      plnTarifPerKwh: currentSpecs.plnTarifPerKwh || 1444,
      isDefault: true,
      notes: "Disimpan langsung dari konfigurasi aktif VRAM Profiler",
      updatedAt: Date.now(),
    };

    const res = saveHardwareProfile(newProfile);
    setProfiles(res.profiles);
    setActiveProfileIdState(newProfile.id);
    onApplyProfile(newProfile);
    if (onToast) onToast("Konfigurasi aktif berhasil disimpan sebagai profil default!");
  };

  const handleStartCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setFormName("Profil Hardware Baru");
    setFormDeviceType("laptop");
    setFormGpuPresetId(currentSpecs?.gpuPresetId || "rtx4060_laptop");
    setFormCustomVram(currentSpecs?.customGpuVram || 8);
    setFormSystemRam(currentSpecs?.systemRamGb || 32);
    setFormDisplayDeduction(currentSpecs?.displayDeductionMode || "primary_single");
    setFormLaptopTgp(currentSpecs?.laptopTgpWatts || 140);
    setFormCpuWatts(currentSpecs?.cpuWatts || 35);
    setFormPlnTarif(currentSpecs?.plnTarifPerKwh || 1444);
    setFormIsDefault(true);
    setFormNotes("");
    setActiveTab("form");
  };

  const handleStartEdit = (profile: HardwareProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditId(profile.id);
    setFormName(profile.name);
    setFormDeviceType(profile.deviceType);
    setFormGpuPresetId(profile.gpuPresetId);
    setFormCustomVram(profile.customGpuVram || 8);
    setFormSystemRam(profile.systemRamGb);
    setFormDisplayDeduction(profile.displayDeductionMode);
    setFormLaptopTgp(profile.laptopTgpWatts || 140);
    setFormCpuWatts(profile.cpuWatts || 35);
    setFormPlnTarif(profile.plnTarifPerKwh || 1444);
    setFormIsDefault(!!profile.isDefault);
    setFormNotes(profile.notes || "");
    setActiveTab("form");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Hapus profil hardware ini?")) {
      const res = deleteHardwareProfile(id);
      setProfiles(res.profiles);
      setActiveProfileIdState(res.activeProfile.id);
      if (onToast) onToast("Profil berhasil dihapus.");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Nama profil tidak boleh kosong.");
      return;
    }

    const selectedGpu = gpuPresets.find((g) => g.id === formGpuPresetId);
    const profileToSave: HardwareProfile = {
      id: isEditing && editId ? editId : `profile_${Date.now()}`,
      name: formName.trim(),
      deviceType: formDeviceType,
      gpuPresetId: formGpuPresetId,
      customGpuVram: formGpuPresetId === "custom" ? formCustomVram : undefined,
      systemRamGb: formSystemRam,
      displayDeductionMode: formDisplayDeduction,
      isLaptop: formDeviceType === "laptop" || !!selectedGpu?.isLaptop,
      laptopTgpWatts: formLaptopTgp,
      tufProfile: "perf",
      cpuWatts: formCpuWatts,
      plnTarifPerKwh: formPlnTarif,
      isDefault: formIsDefault,
      notes: formNotes.trim(),
      updatedAt: Date.now(),
    };

    const res = saveHardwareProfile(profileToSave);
    setProfiles(res.profiles);
    setActiveProfileIdState(profileToSave.id);
    onApplyProfile(profileToSave);
    setActiveTab("list");
    if (onToast) onToast(`Profil '${profileToSave.name}' berhasil disimpan!`);
  };

  const handleExport = () => {
    const json = exportHardwareProfilesJson();
    navigator.clipboard.writeText(json);
    if (onToast) onToast("Data JSON profil berhasil disalin ke clipboard!");
  };

  const handleImport = () => {
    if (!jsonInput.trim()) {
      alert("Masukkan teks JSON profil terlebih dahulu.");
      return;
    }
    const res = importHardwareProfilesJson(jsonInput);
    if (res.success && res.profiles && res.activeProfile) {
      setProfiles(res.profiles);
      setActiveProfileIdState(res.activeProfile.id);
      onApplyProfile(res.activeProfile);
      setShowJsonImport(false);
      setJsonInput("");
      if (onToast) onToast("Profil berhasil diimpor!");
    } else {
      alert(res.error || "Gagal mengimpor JSON.");
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset seluruh profil ke template bawaan standar? Profil kustom Anda akan terhapus.")) {
      const res = resetHardwareProfilesToDefault();
      setProfiles(res.profiles);
      setActiveProfileIdState(res.activeProfile.id);
      onApplyProfile(res.activeProfile);
      if (onToast) onToast("Profil berhasil direset ke setelan awal.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#121215",
          border: "1px solid #27272a",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          color: "#f4f4f5",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#18181b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "#09090b",
                border: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3b82f6",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>
                Profil Hardware (Laptop / PC)
              </div>
              <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                Simpan spesifikasi fisik perangkat Anda agar tidak perlu memilih ulang setiap sesi
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#a1a1aa",
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
            title="Tutup dialog"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            background: "#09090b",
            borderBottom: "1px solid #27272a",
            padding: "0 16px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "list" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "list" ? "#60a5fa" : "#a1a1aa",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Daftar Profil ({profiles.length})
          </button>
          <button
            type="button"
            onClick={handleStartCreate}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "form" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "form" ? "#60a5fa" : "#a1a1aa",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isEditing ? "Edit Profil" : "+ Tambah Profil"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("storage")}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "storage" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "storage" ? "#60a5fa" : "#a1a1aa",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Penyimpanan &amp; Backup
          </button>
        </div>

        {/* Modal Body Content */}
        <div
          style={{
            padding: "18px 20px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* TAB 1: LIST PROFILES */}
          {activeTab === "list" && (
            <>
              {/* Quick Action: Save Current Profiler State */}
              <div
                style={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#f4f4f5" }}>
                    Ingin menyimpan spek yang sedang Anda gunakan saat ini?
                  </div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                    Satu klik mengambil pengaturan GPU, RAM, monitor overhead, dan TGP yang sedang aktif.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCurrentAsProfile}
                  style={{
                    background: "#2563eb",
                    border: "1px solid #3b82f6",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "6px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Simpan Spek Saat Ini ➔
                </button>
              </div>

              {/* Profiles Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {profiles.map((p) => {
                  const isCurrent = p.id === activeProfileId;
                  const gpu = gpuPresets.find((g) => g.id === p.gpuPresetId);
                  const vram = p.gpuPresetId === "custom" ? p.customGpuVram || 8 : gpu?.vramGb || 8;

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: isCurrent ? "#18181b" : "#121215",
                        border: isCurrent ? "2px solid #2563eb" : "1px solid #27272a",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => handleApply(p)}
                    >
                      <div style={{ flex: 1, minWidth: "240px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f5" }}>
                            {p.name}
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 800,
                                background: "#1e3a8a",
                                color: "#93c5fd",
                                border: "1px solid #3b82f6",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                              }}
                            >
                              Aktif
                            </span>
                          )}
                          {p.isDefault && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 800,
                                background: "#78350f",
                                color: "#fde68a",
                                border: "1px solid #f59e0b",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                              }}
                            >
                              Default Sesi
                            </span>
                          )}
                        </div>

                        {/* Specs row */}
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "ui-monospace, monospace",
                              background: "#09090b",
                              border: "1px solid #27272a",
                              color: "#60a5fa",
                              padding: "1px 6px",
                              borderRadius: "3px",
                            }}
                          >
                            GPU: {gpu ? gpu.name.split("(")[0].trim() : p.gpuPresetId} ({vram} GB)
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "ui-monospace, monospace",
                              background: "#09090b",
                              border: "1px solid #27272a",
                              color: "#34d399",
                              padding: "1px 6px",
                              borderRadius: "3px",
                            }}
                          >
                            RAM: {p.systemRamGb} GB
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "ui-monospace, monospace",
                              background: "#09090b",
                              border: "1px solid #27272a",
                              color: "#a1a1aa",
                              padding: "1px 6px",
                              borderRadius: "3px",
                            }}
                          >
                            {p.displayDeductionMode === "primary_single"
                              ? "1 Layar FHD (-0.8G)"
                              : p.displayDeductionMode === "primary_multi"
                              ? "Dual/4K (-1.4G)"
                              : "Headless (0G)"}
                          </span>
                          {p.isLaptop && p.laptopTgpWatts && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontFamily: "ui-monospace, monospace",
                                background: "#09090b",
                                border: "1px solid #27272a",
                                color: "#fbbf24",
                                padding: "1px 6px",
                                borderRadius: "3px",
                              }}
                            >
                              TGP: {p.laptopTgpWatts}W
                            </span>
                          )}
                        </div>

                        {p.notes && (
                          <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "4px" }}>
                            {p.notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {!p.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleSetDefault(p, e)}
                            style={{
                              background: "#18181b",
                              border: "1px solid #27272a",
                              color: "#fbbf24",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                            title="Jadikan profil ini sebagai bawaan standar setiap kali membuka VRAM Profiler"
                          >
                            ★ Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(p, e)}
                          style={{
                            background: "#18181b",
                            border: "1px solid #27272a",
                            color: "#d4d4d8",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          title="Ubah nama atau spesifikasi profil ini"
                        >
                          Edit
                        </button>
                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(p.id, e)}
                            style={{
                              background: "#18181b",
                              border: "1px solid #27272a",
                              color: "#f87171",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                            title="Hapus profil ini"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 2: CREATE / EDIT FORM */}
          {activeTab === "form" && (
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                    Nama Profil Hardware
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="misal: Laptop ASUS TUF A16 atau PC Desktop Kantor"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      marginTop: "4px",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                    Tipe Form Factor Perangkat
                  </label>
                  <select
                    value={formDeviceType}
                    onChange={(e) => setFormDeviceType(e.target.value as any)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      marginTop: "4px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="laptop">Laptop Gaming / Creator</option>
                    <option value="desktop">PC Desktop Rig</option>
                    <option value="server">Server / Cloud Pod / Headless</option>
                    <option value="custom">Kustom Lainnya</option>
                  </select>
                </div>
              </div>

              {/* GPU Preset Selector */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                  Model Kartu Grafis (GPU Target)
                </label>
                <select
                  value={formGpuPresetId}
                  onChange={(e) => {
                    setFormGpuPresetId(e.target.value);
                    const selected = gpuPresets.find((g) => g.id === e.target.value);
                    if (selected?.tdpWatts) setFormLaptopTgp(selected.tdpWatts);
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#f4f4f5",
                    fontSize: "13px",
                    marginTop: "4px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {gpuPresets.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} [{g.category}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom VRAM if custom chosen */}
              {formGpuPresetId === "custom" && (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                    Kapasitas VRAM Kustom (GB): {formCustomVram} GB
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="96"
                    step="1"
                    value={formCustomVram}
                    onChange={(e) => setFormCustomVram(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#3b82f6", marginTop: "6px" }}
                  />
                </div>
              )}

              {/* System RAM & Overhead */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                    Kapasitas RAM Sistem (Host Memory)
                  </label>
                  <select
                    value={formSystemRam}
                    onChange={(e) => setFormSystemRam(Number(e.target.value))}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      marginTop: "4px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value={8}>8 GB DDR4/DDR5</option>
                    <option value={16}>16 GB DDR4/DDR5</option>
                    <option value={24}>24 GB DDR5</option>
                    <option value={32}>32 GB DDR4/DDR5 (Standar AI)</option>
                    <option value={64}>64 GB DDR4/DDR5</option>
                    <option value={128}>128 GB DDR4/DDR5 (Workstation)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                    Beban Layar Windows (Overhead OS)
                  </label>
                  <select
                    value={formDisplayDeduction}
                    onChange={(e) => setFormDisplayDeduction(e.target.value as any)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      marginTop: "4px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="primary_single">1 Layar Laptop/Monitor 1080p-2K (-800 MB)</option>
                    <option value="primary_multi">Dual Monitor atau Layar 4K (-1.4 GB)</option>
                    <option value="headless">Headless / GPU Khusus Compute (0 MB)</option>
                  </select>
                </div>
              </div>

              {/* Laptop TGP & CPU Power */}
              {formDeviceType === "laptop" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                      Batas Daya TGP GPU Laptop (Watts): {formLaptopTgp}W
                    </label>
                    <input
                      type="range"
                      min="35"
                      max="175"
                      step="5"
                      value={formLaptopTgp}
                      onChange={(e) => setFormLaptopTgp(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#3b82f6", marginTop: "6px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                      Daya CPU Saat Inferensi: {formCpuWatts}W
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="95"
                      step="5"
                      value={formCpuWatts}
                      onChange={(e) => setFormCpuWatts(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#3b82f6", marginTop: "6px" }}
                    />
                  </div>
                </div>
              )}

              {/* Set as Default Checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12.5px",
                  color: "#f4f4f5",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  style={{ accentColor: "#2563eb", width: "16px", height: "16px", cursor: "pointer" }}
                />
                Jadikan profil ini sebagai standar default setiap kali halaman VRAM dibuka
              </label>

              {/* Notes */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase" }}>
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="misal: Setup undervolt -100mV, dual-channel DDR5 5600MHz"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#f4f4f5",
                    fontSize: "13px",
                    marginTop: "4px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  style={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    color: "#a1a1aa",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#2563eb",
                    border: "1px solid #3b82f6",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Simpan Profil
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: STORAGE & BACKUP EXPLANATION */}
          {activeTab === "storage" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  padding: "14px",
                  fontSize: "12.5px",
                  lineHeight: "1.6",
                  color: "#d4d4d8",
                }}
              >
                <strong style={{ color: "#f4f4f5", display: "block", marginBottom: "6px" }}>
                  Mengapa Disimpan di LocalStorage daripada Database Akun?
                </strong>
                <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", color: "#a1a1aa" }}>
                  <li>
                    <strong style={{ color: "#f4f4f5" }}>Spesifik per Perangkat Fisik:</strong> Jika Anda memiliki laptop gaming di luar rumah dan PC desktop di kantor/rumah, kedua mesin memiliki spek hardware yang berbeda. LocalStorage secara cerdas mengingat spesifikasi laptop di laptop Anda, dan spesifikasi PC di PC Anda tanpa saling menimpa.
                  </li>
                  <li>
                    <strong style={{ color: "#f4f4f5" }}>Nol Latensi &amp; Privasi Penuh:</strong> Data dimuat instan dalam 0 ms saat membuka halaman tanpa memerlukan roundtrip ke server atau login akun.
                  </li>
                  <li>
                    <strong style={{ color: "#f4f4f5" }}>Bebas Dipindahkan:</strong> Anda dapat menggunakan fitur <em>Export JSON</em> di bawah untuk mem-backup atau mentransfer profil ke browser lain.
                  </li>
                </ul>
              </div>

              {/* Backup Controls */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleExport}
                  style={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    color: "#60a5fa",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Salin Backup JSON ke Clipboard
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonImport((prev) => !prev)}
                  style={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    color: "#f4f4f5",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showJsonImport ? "Tutup Form Impor" : "Impor Profil dari JSON"}
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  style={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    color: "#f87171",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}
                >
                  Reset ke Setelan Pabrik
                </button>
              </div>

              {showJsonImport && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea
                    rows={6}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="Tempel format JSON profil di sini..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      color: "#93c5fd",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleImport}
                    style={{
                      alignSelf: "flex-end",
                      background: "#2563eb",
                      border: "1px solid #3b82f6",
                      color: "#ffffff",
                      padding: "6px 14px",
                      borderRadius: "5px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Terapkan Impor JSON
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #27272a",
            background: "#18181b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
            Profil Terpilih: <strong style={{ color: "#f4f4f5" }}>{activeProfile?.name}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#27272a",
              border: "1px solid #3f3f46",
              color: "#f4f4f5",
              padding: "6px 14px",
              borderRadius: "5px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
