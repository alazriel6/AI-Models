// ============================================================================
// Hardware Profile Management System (LocalStorage Persistence)
// Stores laptop/PC hardware specs so users don't have to reconfigure every session.
// ============================================================================

export interface HardwareProfile {
  id: string;
  name: string;
  deviceType: "laptop" | "desktop" | "server" | "custom";
  gpuPresetId: string;
  customGpuVram?: number;
  systemRamGb: number;
  displayDeductionMode: "primary_single" | "primary_multi" | "headless";
  isLaptop?: boolean;
  laptopTgpWatts?: number;
  tufProfile?: "turbo" | "perf" | "silent" | "overnight" | "custom";
  cpuWatts?: number;
  plnTarifPerKwh?: number;
  isDefault?: boolean;
  notes?: string;
  updatedAt: number;
}

const PROFILES_STORAGE_KEY = "mg_hardware_profiles_v1";
const ACTIVE_PROFILE_STORAGE_KEY = "mg_active_hardware_profile_id";

export const DEFAULT_HARDWARE_PROFILES: HardwareProfile[] = [
  {
    id: "default_laptop_tuf",
    name: "Laptop ASUS TUF / Nitro (RTX 4060 Mobile 8GB)",
    deviceType: "laptop",
    gpuPresetId: "rtx4060_laptop",
    systemRamGb: 32,
    displayDeductionMode: "primary_single",
    isLaptop: true,
    laptopTgpWatts: 140,
    tufProfile: "perf",
    cpuWatts: 35,
    plnTarifPerKwh: 1444,
    isDefault: true,
    notes: "Preset laptop gaming mainstream 140W TGP dengan 32GB RAM DDR5",
    updatedAt: Date.now(),
  },
  {
    id: "default_desktop_sweetspot",
    name: "PC Desktop Sweetspot (RTX 3060 12GB)",
    deviceType: "desktop",
    gpuPresetId: "rtx3060_12",
    systemRamGb: 32,
    displayDeductionMode: "primary_multi",
    isLaptop: false,
    cpuWatts: 65,
    plnTarifPerKwh: 1444,
    isDefault: false,
    notes: "Preset workstation AI ramah budget dengan 12GB VRAM",
    updatedAt: Date.now(),
  },
  {
    id: "default_desktop_enthusiast",
    name: "PC Desktop Enthusiast (RTX 4070 Ti Super 16GB)",
    deviceType: "desktop",
    gpuPresetId: "rtx4070ti",
    systemRamGb: 64,
    displayDeductionMode: "primary_multi",
    isLaptop: false,
    cpuWatts: 105,
    plnTarifPerKwh: 1444,
    isDefault: false,
    notes: "Preset PC enthusiast 16GB VRAM untuk SDXL & Flux Dev",
    updatedAt: Date.now(),
  },
  {
    id: "default_flagship_4090",
    name: "PC Desktop Flagship Creator (RTX 4090 24GB)",
    deviceType: "desktop",
    gpuPresetId: "rtx4090",
    systemRamGb: 64,
    displayDeductionMode: "primary_multi",
    isLaptop: false,
    cpuWatts: 125,
    plnTarifPerKwh: 1444,
    isDefault: false,
    notes: "Monster 24GB VRAM untuk inferensi video Wan 2.1 & Flux FP16",
    updatedAt: Date.now(),
  },
];

/**
 * Retrieve all stored hardware profiles from LocalStorage.
 * Falls back to DEFAULT_HARDWARE_PROFILES if empty.
 */
export function getHardwareProfiles(): HardwareProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(DEFAULT_HARDWARE_PROFILES));
      return DEFAULT_HARDWARE_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Gagal membaca profil hardware dari localStorage:", err);
  }
  return DEFAULT_HARDWARE_PROFILES;
}

/**
 * Retrieve the active hardware profile.
 * If not set, returns the profile marked as `isDefault: true` or the first profile.
 */
export function getActiveHardwareProfile(): HardwareProfile {
  const profiles = getHardwareProfiles();
  try {
    const activeId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    if (activeId) {
      const match = profiles.find((p) => p.id === activeId);
      if (match) return match;
    }
  } catch (err) {
    console.error("Gagal membaca ID profil hardware aktif:", err);
  }
  const defaultProf = profiles.find((p) => p.isDefault) || profiles[0];
  return defaultProf || DEFAULT_HARDWARE_PROFILES[0];
}

/**
 * Save or update a hardware profile in LocalStorage.
 * If marked as default, other profiles will have isDefault unset.
 */
export function saveHardwareProfile(profile: HardwareProfile): {
  profiles: HardwareProfile[];
  activeProfile: HardwareProfile;
} {
  const existing = getHardwareProfiles();
  const index = existing.findIndex((p) => p.id === profile.id);

  let updatedList = [...existing];
  const now = Date.now();
  const profileToSave = { ...profile, updatedAt: now };

  if (profileToSave.isDefault) {
    updatedList = updatedList.map((p) => ({ ...p, isDefault: false }));
  }

  if (index >= 0) {
    updatedList[index] = profileToSave;
  } else {
    updatedList.push(profileToSave);
  }

  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedList));
    if (profileToSave.isDefault) {
      localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileToSave.id);
    }
  } catch (err) {
    console.error("Gagal menyimpan profil hardware ke localStorage:", err);
  }

  return {
    profiles: updatedList,
    activeProfile: profileToSave,
  };
}

/**
 * Set an active hardware profile by ID.
 * Optionally set it as default so it stays persistent across sessions.
 */
export function setActiveHardwareProfile(id: string, setAsDefault: boolean = true): HardwareProfile | null {
  const profiles = getHardwareProfiles();
  const target = profiles.find((p) => p.id === id);
  if (!target) return null;

  try {
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, target.id);
    if (setAsDefault) {
      const updatedList = profiles.map((p) => ({
        ...p,
        isDefault: p.id === target.id,
      }));
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (err) {
    console.error("Gagal mengaktifkan profil hardware:", err);
  }

  return target;
}

/**
 * Delete a hardware profile by ID.
 * Prevents deleting the last remaining profile.
 */
export function deleteHardwareProfile(id: string): {
  profiles: HardwareProfile[];
  activeProfile: HardwareProfile;
} {
  const profiles = getHardwareProfiles();
  if (profiles.length <= 1) {
    return {
      profiles,
      activeProfile: profiles[0],
    };
  }

  const updatedList = profiles.filter((p) => p.id !== id);
  let activeId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

  if (activeId === id) {
    activeId = updatedList[0].id;
    updatedList[0].isDefault = true;
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeId);
  }

  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error("Gagal menghapus profil hardware:", err);
  }

  const active = updatedList.find((p) => p.id === activeId) || updatedList[0];
  return {
    profiles: updatedList,
    activeProfile: active,
  };
}

/**
 * Reset all hardware profiles to factory defaults.
 */
export function resetHardwareProfilesToDefault(): {
  profiles: HardwareProfile[];
  activeProfile: HardwareProfile;
} {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(DEFAULT_HARDWARE_PROFILES));
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, DEFAULT_HARDWARE_PROFILES[0].id);
  } catch (err) {
    console.error("Gagal mereset profil hardware:", err);
  }
  return {
    profiles: DEFAULT_HARDWARE_PROFILES,
    activeProfile: DEFAULT_HARDWARE_PROFILES[0],
  };
}

/**
 * Export hardware profiles to a formatted JSON string for backup.
 */
export function exportHardwareProfilesJson(): string {
  const profiles = getHardwareProfiles();
  const activeId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      activeProfileId: activeId,
      profiles,
    },
    null,
    2
  );
}

/**
 * Import hardware profiles from a JSON string.
 */
export function importHardwareProfilesJson(jsonStr: string): {
  success: boolean;
  profiles?: HardwareProfile[];
  activeProfile?: HardwareProfile;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonStr);
    const profiles = Array.isArray(data) ? data : data?.profiles;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { success: false, error: "Format JSON tidak valid atau profil kosong." };
    }

    // Basic structure validation
    for (const p of profiles) {
      if (!p.id || !p.name || !p.gpuPresetId) {
        return { success: false, error: "Setiap profil harus memiliki 'id', 'name', dan 'gpuPresetId'." };
      }
    }

    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    const activeId = data.activeProfileId || profiles[0].id;
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeId);

    const active = profiles.find((p: HardwareProfile) => p.id === activeId) || profiles[0];
    return {
      success: true,
      profiles,
      activeProfile: active,
    };
  } catch (err) {
    return { success: false, error: `Gagal membaca JSON: ${String(err)}` };
  }
}
