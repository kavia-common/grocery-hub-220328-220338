import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchByImage } from "../services/imageSearchService";
import { addToCart } from "../services/productsService";
import { useNotifications } from "../notifications/NotificationsContext";

// Style constants (Ocean Professional)
const COLORS = {
  primary: "#2563EB",
  secondary: "#F59E0B",
  surface: "#ffffff",
  background: "#f9fafb",
  text: "#111827",
  error: "#EF4444",
};

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // ignore
    }
  }, [key, val]);
  return [val, setVal];
}

// PUBLIC_INTERFACE
export default function ImageSearchPage() {
  /**
   * Image Search page: users upload an image, we try to match products via backend or mock heuristic,
   * then display candidate matches with similarity scores and CTAs: View Details, Add to Cart, Quick Buy.
   */
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { notifySuccess, notifyWarning, notifyError } = useNotifications?.() || {
    notifySuccess: () => {},
    notifyWarning: () => {},
    notifyError: () => {},
  };

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [altText, setAltText] = useLocalStorage("imageSearch.altText", "");
  const [results, setResults] = useLocalStorage("imageSearch.results", []);
  const [lastImage, setLastImage] = useLocalStorage("imageSearch.lastImage", null);
  const [loading, setLoading] = useState(false);

  // restore preview from last search
  useEffect(() => {
    if (lastImage && !file && !previewUrl) {
      setPreviewUrl(lastImage.dataUrl || "");
    }
  }, [lastImage, file, previewUrl]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Accept only common image types
    if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type)) {
      notifyWarning("Please select a PNG, JPG, JPEG, WEBP, GIF or BMP image.");
      return;
    }
    setFile(f);
  };

  const onFindProduct = async () => {
    if (!file && !lastImage?.blobType) {
      notifyWarning("Please upload an image to search.");
      return;
    }
    setLoading(true);
    try {
      let activeFile = file;
      if (!activeFile && lastImage?.blobType && lastImage?.dataUrl) {
        // reconstruct a file from dataURL for re-search
        const res = await fetch(lastImage.dataUrl);
        const blob = await res.blob();
        activeFile = new File([blob], lastImage.name || "previous-image", { type: lastImage.blobType });
      }

      const matches = await searchByImage(activeFile, { altText, useBackendIfAvailable: true });
      setResults(matches || []);

      // store last image for revisit
      if (activeFile) {
        const dataUrl = await readFileAsDataURL(activeFile);
        setLastImage({ name: activeFile.name, blobType: activeFile.type, dataUrl });
      }

      if (!matches || matches.length === 0) {
        notifyWarning("No matching products found. Try a different image or add a short tag.");
      } else {
        notifySuccess(`Found ${matches.length} candidate${matches.length > 1 ? "s" : ""}.`);
      }
    } catch (e) {
      notifyError("Image search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const acceptAttr = useMemo(
    () => "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp",
    []
  );

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      notifySuccess("Added to cart!");
    } catch {
      notifyError("Failed to add to cart.");
    }
  };

  const handleQuickBuy = async (productId) => {
    try {
      await addToCart(productId, 1);
      notifySuccess("Added to cart. Redirecting to checkout...");
      navigate("/checkout");
    } catch {
      notifyError("Quick buy failed.");
    }
  };

  const handleViewDetails = (productId) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Image Search</h1>
        <p style={styles.subtitle}>Upload a product image and we’ll find the closest matches.</p>

        <div style={styles.uploadRow}>
          <div style={styles.uploadBox}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                style={{ maxWidth: "100%", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
              />
            ) : (
              <div style={styles.placeholder}>
                <span role="img" aria-label="camera" style={{ fontSize: 28, marginBottom: 8 }}>
                  📷
                </span>
                <div style={{ color: "#6B7280" }}>No image selected</div>
              </div>
            )}
          </div>

          <div style={styles.controls}>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              onChange={onFileChange}
              style={styles.fileInput}
            />
            <input
              type="text"
              placeholder="Optional tag (e.g., 'apple', 'whole milk')"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              style={styles.textInput}
            />
            <button onClick={onFindProduct} disabled={loading} style={styles.primaryButton}>
              {loading ? "Searching..." : "Find product"}
            </button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Results</h2>
        {(!results || results.length === 0) && (
          <div style={{ color: "#6B7280" }}>No results yet. Upload an image and click Find product.</div>
        )}
        <div style={styles.resultsGrid}>
          {results?.map((r, idx) => {
            const p = r.product || {};
            const score = typeof r.score === "number" ? r.score : 0;
            const pct = Math.min(100, Math.round((score / (score + 5)) * 100) || score * 10 || 0); // rough normalization
            return (
              <div key={p.id ?? idx} style={styles.resultCard}>
                <div style={styles.resultHeader}>
                  <div style={styles.resultName}>{p.name || "Product"}</div>
                  <div style={styles.badge}>{pct}%</div>
                </div>
                <div style={{ fontSize: 13, color: "#4B5563", marginBottom: 8 }}>
                  {p.category ? `Category: ${p.category}` : null}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.linkButton} onClick={() => handleViewDetails(p.id)}>View Details</button>
                  <button style={styles.secondaryButton} onClick={() => handleAddToCart(p.id)}>Add to Cart</button>
                  <button style={styles.accentButton} onClick={() => handleQuickBuy(p.id)}>Quick Buy</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

const styles = {
  page: {
    padding: 16,
    background: COLORS.background,
    minHeight: "100vh",
  },
  card: {
    background: COLORS.surface,
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.08)",
    padding: 16,
    marginBottom: 16,
    border: "1px solid rgba(37, 99, 235, 0.10)",
  },
  title: {
    margin: 0,
    color: COLORS.text,
    fontSize: 22,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 0,
    color: "#4B5563",
    fontSize: 14,
  },
  uploadRow: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 360px) 1fr",
    gap: 16,
    marginTop: 16,
    alignItems: "start",
  },
  uploadBox: {
    background: "#F3F4F6",
    borderRadius: 12,
    padding: 8,
    minHeight: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed #93C5FD",
  },
  placeholder: {
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    color: "#6B7280",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  fileInput: {
    padding: 8,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    background: "#fff",
  },
  textInput: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    outline: "none",
  },
  primaryButton: {
    background: COLORS.primary,
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "#E5E7EB",
    color: COLORS.text,
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  accentButton: {
    background: COLORS.secondary,
    color: "#1F2937",
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
  linkButton: {
    background: "transparent",
    color: COLORS.primary,
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${COLORS.primary}`,
    cursor: "pointer",
    fontWeight: 600,
  },
  sectionTitle: {
    margin: 0,
    color: COLORS.text,
    fontSize: 18,
    marginBottom: 12,
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  resultCard: {
    background: "#F9FAFB",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: 12,
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  resultName: {
    fontWeight: 700,
    color: COLORS.text,
  },
  badge: {
    background: "linear-gradient(90deg, rgba(37,99,235,0.15), rgba(245,158,11,0.15))",
    color: COLORS.text,
    padding: "4px 8px",
    borderRadius: 9999,
    fontSize: 12,
    border: "1px solid rgba(0,0,0,0.06)",
  },
};
