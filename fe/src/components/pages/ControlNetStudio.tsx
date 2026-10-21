import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkflowBridgeBanner } from "../common/WorkflowBridgeBanner";
import { OpenPoseCanvas } from "../controlnet/OpenPoseCanvas";
import { PreprocessorGuide } from "../controlnet/PreprocessorGuide";
import { ControlNetMatrix } from "../controlnet/ControlNetMatrix";
import { PoseThumbnailSvg } from "../controlnet/openposeConstants";
import {
  getControlNetPosesApi,
  deleteControlNetPoseApi,
  type ControlNetPose,
  FALLBACK_POSES,
} from "../../api/controlnet";
import "../../style/ControlNetStudio.css";

export type ControlNetStudioTab = "openpose" | "preprocessors" | "matrix";

export default function ControlNetStudio() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const initialTab = (searchParams.get("tab") as ControlNetStudioTab) || "openpose";
  const [activeTab, setActiveTab] = useState<ControlNetStudioTab>(initialTab);

  // OpenPose Poses State
  const [poses, setPoses] = useState<ControlNetPose[]>(FALLBACK_POSES);
  const [selectedPose, setSelectedPose] = useState<ControlNetPose | null>(null);
  const [loadingPoses, setLoadingPoses] = useState<boolean>(true);
  const [poseCategoryFilter, setPoseCategoryFilter] = useState<string>("All");
  const [poseSearchQuery, setPoseSearchQuery] = useState<string>("");

  // Sync tab with URL search params
  const handleSelectTab = (tab: ControlNetStudioTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // Fetch poses from database
  const loadPoses = async () => {
    setLoadingPoses(true);
    try {
      const res = await getControlNetPosesApi();
      if (res.data && res.data.length > 0) {
        setPoses(res.data);
        if (!selectedPose) {
          setSelectedPose(res.data[0]);
        }
      } else {
        setPoses(FALLBACK_POSES);
        if (!selectedPose) {
          setSelectedPose(FALLBACK_POSES[0]);
        }
      }
    } catch (err) {
      console.warn("Using fallback poses:", err);
      setPoses(FALLBACK_POSES);
      if (!selectedPose) {
        setSelectedPose(FALLBACK_POSES[0]);
      }
    } finally {
      setLoadingPoses(false);
    }
  };

  useEffect(() => {
    loadPoses();
  }, []);

  // Filtered Poses for Gallery
  const filteredPoses = useMemo(() => {
    return poses.filter((p) => {
      const matchCat =
        poseCategoryFilter === "All" ||
        p.category.toLowerCase() === poseCategoryFilter.toLowerCase();
      const matchSearch =
        poseSearchQuery === "" ||
        p.title.toLowerCase().includes(poseSearchQuery.toLowerCase()) ||
        p.tags.toLowerCase().includes(poseSearchQuery.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [poses, poseCategoryFilter, poseSearchQuery]);

  // Handle Pose Saved callback
  const handlePoseSaved = (newPose: ControlNetPose) => {
    setPoses((prev) => [newPose, ...prev]);
    setSelectedPose(newPose);
  };

  // Handle Delete Pose
  const handleDeletePose = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm("Hapus pose ini dari database?")) return;

    try {
      await deleteControlNetPoseApi(id);
      setPoses((prev) => prev.filter((p) => p.id !== id));
      if (selectedPose?.id === id) {
        setSelectedPose(poses[0] || null);
      }
    } catch (err) {
      console.error("Gagal menghapus pose:", err);
      alert("Gagal menghapus pose.");
    }
  };

  const poseCategories = [
    "All",
    "Standing & Model",
    "Action & Combat",
    "Sitting & Relaxed",
    "Dynamic & Aerial",
    "Portrait & Selfie",
    "Duo & Interaction",
  ];

  return (
    <div className="controlnet-studio-page">
      {/* Universal Workflow Bridge Banner */}
      <WorkflowBridgeBanner currentTool="controlnet" />

      {/* Main Studio Header */}
      <header className="studio-hero-banner">
        <div className="banner-content">
          <div className="banner-badge-row">
            <span className="studio-pill">GENERATIVE CONTROL STUDIO</span>
            <span className="studio-meta-tag">OpenPose • Preprocessors • ControlNet Matrix</span>
          </div>
          <h1 className="studio-main-heading">ControlNet &amp; OpenPose Rig Studio</h1>
          <p className="studio-tagline">
            Pusat kendali komposisi dan anatomi AI terlengkap. Buat dan manipulasi pose skeleton 18-joint interaktif, pelajari parameter ekstraksi Canny hingga DepthAnything V2, dan temukan bobot model ControlNet terbaik untuk SD 1.5, SDXL, dan Flux.1.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="studio-tab-navigation" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "openpose"}
            className={`studio-tab-btn ${activeTab === "openpose" ? "active" : ""}`}
            onClick={() => handleSelectTab("openpose")}
          >
            <span className="tab-icon">🦴</span>
            <span className="tab-label">OpenPose Skeleton Rig</span>
            <span className="tab-count-badge">{poses.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preprocessors"}
            className={`studio-tab-btn ${activeTab === "preprocessors" ? "active" : ""}`}
            onClick={() => handleSelectTab("preprocessors")}
          >
            <span className="tab-icon">🔬</span>
            <span className="tab-label">Preprocessor Cheat-Sheet</span>
            <span className="tab-count-badge">9 Labs</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "matrix"}
            className={`studio-tab-btn ${activeTab === "matrix" ? "active" : ""}`}
            onClick={() => handleSelectTab("matrix")}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Model Architecture Matrix</span>
            <span className="tab-count-badge">Flux • SDXL • SD 1.5</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="studio-tab-content">
        {/* ================= TAB 1: OPENPOSE RIG ================= */}
        {activeTab === "openpose" && (
          <div className="tab-pane-openpose">
            {/* Interactive Canvas & Inspector */}
            <OpenPoseCanvas
              selectedPose={selectedPose}
              onPoseSaved={handlePoseSaved}
            />

            {/* Pose Gallery Browser */}
            <section className="pose-gallery-section">
              <div className="gallery-section-header">
                <div className="gallery-title-col">
                  <h3>OpenPose Preset Library</h3>
                  <p>Pilih pose untuk dimuat ke editor canvas di atas, atau download langsung dalam format PNG / JSON.</p>
                </div>

                <div className="gallery-search-wrap">
                  <input
                    type="text"
                    value={poseSearchQuery}
                    onChange={(e) => setPoseSearchQuery(e.target.value)}
                    placeholder="Cari pose atau tags..."
                    className="gallery-search-input"
                  />
                </div>
              </div>

              {/* Categories Pills */}
              <div className="gallery-categories-pills">
                {poseCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`gallery-cat-pill ${poseCategoryFilter === cat ? "active" : ""}`}
                    onClick={() => setPoseCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Poses Grid */}
              {loadingPoses && poses.length === 0 ? (
                <div className="gallery-loading-indicator">Memuat pose dari database...</div>
              ) : (
                <div className="poses-cards-grid">
                  {filteredPoses.map((pose) => {
                  const isSelected = selectedPose?.id === pose.id;
                  return (
                    <div
                      key={pose.id}
                      className={`pose-gallery-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedPose(pose);
                        window.scrollTo({ top: 180, behavior: "smooth" });
                      }}
                    >
                      <div className="card-skeleton-preview-box">
                        <div className="skeleton-preview-graphic">
                          <PoseThumbnailSvg
                            keypointsData={pose.keypoints_data}
                            width={pose.canvas_width || 512}
                            height={pose.canvas_height || 768}
                            className="mini-skeleton-svg"
                          />
                        </div>
                        <span className="card-category-badge">{pose.category}</span>
                      </div>

                      <div className="card-info-wrap">
                        <div className="card-title-row">
                          <h4 className="card-pose-title">{pose.title}</h4>
                          {!pose.is_system && (
                            <button
                              type="button"
                              className="delete-custom-pose-btn"
                              onClick={(e) => handleDeletePose(e, pose.id)}
                              title="Hapus pose kustom"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                        <p className="card-pose-description">{pose.description}</p>

                        <div className="card-pose-footer">
                          <span className="load-action-text">
                            {isSelected ? "Sedang Diedit" : "Muat ke Canvas →"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </section>
          </div>
        )}

        {/* ================= TAB 2: PREPROCESSORS ================= */}
        {activeTab === "preprocessors" && <PreprocessorGuide />}

        {/* ================= TAB 3: MATRIX ================= */}
        {activeTab === "matrix" && <ControlNetMatrix />}
      </main>
    </div>
  );
}
