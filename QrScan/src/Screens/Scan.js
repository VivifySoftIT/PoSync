import React, { useState } from "react";
import { Camera, CheckCircle } from "lucide-react";

const Scan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [formData, setFormData] = useState({
    quantity: "",
    poNo: "",
    poCode: "",
    poDate: "",
    customer: ""
  });

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setScannedData("QR123456789");
      setIsScanning(false);
    }, 2000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    console.log("Saved data:", { scannedData, ...formData });
    alert("Data saved successfully!");
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>QR Scanner</h1>
            <p style={styles.subtitle}>Scan and capture product details</p>
          </div>
          <div style={styles.iconContainer}>
            <Camera style={styles.icon} />
          </div>
        </div>
      </div>

      {/* QR Scanner Section */}
      <div style={styles.scannerSection}>
        <div style={styles.scannerHeader}>
          <h2 style={styles.scannerTitle}>Scan QR Code</h2>
          <p style={styles.scannerSubtitle}>Position QR code within the frame</p>
        </div>

        {/* QR Scanner Frame */}
        <div style={styles.scannerContainer}>
          <div style={styles.scannerFrame}>
            {/* Scanner Animation */}
            {isScanning && (
              <div style={styles.scannerAnimation} />
            )}
            
            {/* Scanner Border */}
            <div style={styles.scannerBorder}>
              <div style={{...styles.corner, ...styles.cornerTopLeft}}></div>
              <div style={{...styles.corner, ...styles.cornerTopRight}}></div>
              <div style={{...styles.corner, ...styles.cornerBottomLeft}}></div>
              <div style={{...styles.corner, ...styles.cornerBottomRight}}></div>
            </div>

            {/* Placeholder QR */}
            {!isScanning && !scannedData && (
              <div style={styles.placeholderQR}>
                <div style={styles.qrPattern}>
                  <div style={styles.qrRow}>
                    <div style={styles.qrCell}></div>
                    <div style={styles.qrCell}></div>
                    <div style={styles.qrCell}></div>
                    <div style={styles.qrCell}></div>
                  </div>
                  <div style={styles.qrRow}>
                    <div style={styles.qrCell}></div>
                    <div style={{...styles.qrCell, ...styles.qrEmpty}}></div>
                    <div style={{...styles.qrCell, ...styles.qrEmpty}}></div>
                    <div style={styles.qrCell}></div>
                  </div>
                  <div style={styles.qrRow}>
                    <div style={styles.qrCell}></div>
                    <div style={{...styles.qrCell, ...styles.qrEmpty}}></div>
                    <div style={styles.qrCell}></div>
                    <div style={styles.qrCell}></div>
                  </div>
                  <div style={styles.qrRow}>
                    <div style={styles.qrCell}></div>
                    <div style={styles.qrCell}></div>
                    <div style={{...styles.qrCell, ...styles.qrEmpty}}></div>
                    <div style={styles.qrCell}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {scannedData && (
              <div style={styles.successState}>
                <CheckCircle style={styles.successIcon} />
                <p style={styles.successText}>QR Code Scanned!</p>
                <p style={styles.scannedData}>{scannedData}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scan Button */}
        <button 
          onClick={handleScan}
          disabled={isScanning}
          style={{
            ...styles.scanButton,
            ...(isScanning ? styles.scanButtonDisabled : {})
          }}
        >
          {isScanning ? (
            <>
              <div style={styles.spinner}></div>
              Scanning...
            </>
          ) : (
            <>
              <Camera style={styles.buttonIcon} />
              Scan QR Code
            </>
          )}
        </button>
      </div>

      {/* Form Section */}
      <div style={styles.formSection}>
        <h3 style={styles.formTitle}>Product Details</h3>
        
        <div style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Enter quantity"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PO No</label>
            <input
              type="text"
              name="poNo"
              value={formData.poNo}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Enter PO number"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PO Code</label>
            <input
              type="text"
              name="poCode"
              value={formData.poCode}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Enter PO code"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PO Date</label>
            <input
              type="date"
              name="poDate"
              value={formData.poDate}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Customer</label>
            <input
              type="text"
              name="customer"
              value={formData.customer}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Enter customer name"
            />
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} style={styles.saveButton}>
          <CheckCircle style={styles.buttonIcon} />
          Save Details
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)",
    padding: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  header: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    marginBottom: "24px"
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
    marginBottom: "4px"
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0
  },
  iconContainer: {
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    color: "#ffffff",
    width: "20px",
    height: "20px"
  },
  scannerSection: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "24px",
    marginBottom: "24px"
  },
  scannerHeader: {
    textAlign: "center",
    marginBottom: "24px"
  },
  scannerTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
    marginBottom: "8px"
  },
  scannerSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0
  },
  scannerContainer: {
    position: "relative",
    marginBottom: "24px"
  },
  scannerFrame: {
    backgroundColor: "#111827",
    borderRadius: "12px",
    aspectRatio: "1",
    maxWidth: "280px",
    margin: "0 auto",
    position: "relative",
    overflow: "hidden"
  },
  scannerAnimation: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, transparent 0%, rgba(59, 130, 246, 0.2) 50%, transparent 100%)",
    animation: "pulse 2s infinite"
  },
  scannerBorder: {
    position: "absolute",
    inset: "8px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px"
  },
  corner: {
    position: "absolute",
    width: "20px",
    height: "20px",
    border: "2px solid #3b82f6"
  },
  cornerTopLeft: {
    top: "-1px",
    left: "-1px",
    borderRight: "none",
    borderBottom: "none",
    borderTopLeftRadius: "8px"
  },
  cornerTopRight: {
    top: "-1px",
    right: "-1px",
    borderLeft: "none",
    borderBottom: "none",
    borderTopRightRadius: "8px"
  },
  cornerBottomLeft: {
    bottom: "-1px",
    left: "-1px",
    borderRight: "none",
    borderTop: "none",
    borderBottomLeftRadius: "8px"
  },
  cornerBottomRight: {
    bottom: "-1px",
    right: "-1px",
    borderLeft: "none",
    borderTop: "none",
    borderBottomRightRadius: "8px"
  },
  placeholderQR: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "20px"
  },
  qrPattern: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  qrRow: {
    display: "flex",
    gap: "4px"
  },
  qrCell: {
    width: "12px",
    height: "12px",
    backgroundColor: "#ffffff",
    borderRadius: "2px"
  },
  qrEmpty: {
    backgroundColor: "transparent"
  },
  successState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#ffffff"
  },
  successIcon: {
    width: "48px",
    height: "48px",
    color: "#10b981",
    marginBottom: "12px"
  },
  successText: {
    fontSize: "16px",
    fontWeight: "600",
    margin: 0,
    marginBottom: "8px"
  },
  scannedData: {
    fontSize: "14px",
    color: "#d1d5db",
    margin: 0
  },
  scanButton: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  scanButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed"
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid transparent",
    borderTop: "2px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  buttonIcon: {
    width: "18px",
    height: "18px"
  },
  formSection: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "24px"
  },
  formTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
    marginBottom: "20px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "24px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151"
  },
  input: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s ease"
  },
  saveButton: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  }
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes pulse {
    0% { transform: translateY(-100%); }
    50% { transform: translateY(100%); }
    100% { transform: translateY(-100%); }
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  button:active {
    transform: translateY(0);
  }
`, styleSheet.cssRules.length);

export default Scan;