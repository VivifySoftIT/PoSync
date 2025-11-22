import React, { useState, useEffect, useRef } from "react";
import { Scan as ScanIcon, CheckCircle, X, Loader, FileText, Calendar, User, Package, Save, Camera, CameraOff } from "lucide-react";
import axios from 'axios';
import API_BASE_URL from './apiConfig';
import jsQR from "jsqr";

const ScanSimple = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enteredQty, setEnteredQty] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedCode = useRef(null);

  // Check if device has camera
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasCamera(videoDevices.length > 0);
        } else {
          setHasCamera(false);
        }
      } catch (err) {
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  // Extract QR ID from scanned data
  const extractQRIdFromScannedData = (scannedText) => {
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = scannedText.match(uuidPattern);
    if (uuidMatch) return uuidMatch[0];

    const qrIdPattern = /QRid=([^&]+)/i;
    const qrIdMatch = scannedText.match(qrIdPattern);
    if (qrIdMatch && qrIdMatch[1]) return qrIdMatch[1];

    if (scannedText.includes('/')) {
      const segments = scannedText.split('/').filter(seg => seg);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) return lastSegment;
    }

    return scannedText;
  };

  // Start QR Scanning
  const startQRScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    lastScannedCode.current = null;
    
    scanIntervalRef.current = setInterval(() => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        const context = canvas.getContext('2d');
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);
          
          const imageData = context.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, width, height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code && code.data !== lastScannedCode.current) {
            console.log("🎯 QR Code Found:", code.data);
            lastScannedCode.current = code.data;
            
            const extractedId = extractQRIdFromScannedData(code.data);
            console.log("📋 Extracted ID:", extractedId);
            
            // Immediately stop scanning and close scanner
            stopQRScanning();
            setIsScanning(false);
            callQRApi(extractedId);
          }
        }
      } catch (err) {
        console.error("Scanning error:", err);
      }
    }, 300);
  };

  const stopQRScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setCameraError('');
      setCameraReady(false);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not supported');
        return false;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadeddata = () => {
          console.log("✅ Camera ready - starting scan");
          setCameraReady(true);
          startQRScanning();
        };

        // Fallback for faster startup
        setTimeout(() => {
          if (!cameraReady && videoRef.current?.readyState >= 2) {
            console.log("🔄 Fallback camera start");
            setCameraReady(true);
            startQRScanning();
          }
        }, 1000);
      }
      
      return true;
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = 'Cannot access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found';
      }
      setCameraError(errorMessage);
      return false;
    }
  };

  const stopCamera = () => {
    console.log("🛑 Stopping camera");
    stopQRScanning();
    setCameraReady(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleScanClick = async () => {
    console.log("📱 Scan button clicked - starting camera immediately");
    setIsScanning(true);
    setError('');
    setCameraError('');
    
    if (hasCamera) {
      await startCamera();
    } else {
      setCameraError('No camera available');
    }
  };

  const handleCloseScanner = () => {
    console.log("❌ Closing scanner manually");
    setIsScanning(false);
    setLoading(false);
    stopCamera();
  };

  // API call
  const callQRApi = async (id) => {
    setLoading(true);
    setError('');
    try {
      console.log("🚀 Calling API with ID:", id);
      
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = `${baseUrl}/api/posync/QR?id=${encodeURIComponent(id)}`;
      
      console.log("📡 API URL:", url);
      
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;
      
      console.log("✅ API Response received:", data);
      
      setScannedData(data);
      
      // Always reset enteredQty to empty when new QR is scanned
      setEnteredQty('');
      
    } catch (err) {
      console.error('❌ API Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch data';
      setError(`API Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

 const updatePOQuantity = async () => {
  if (!enteredQty || !scannedData) return;
  setUpdateLoading(true);
  setError('');
  try {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = `${baseUrl}/api/posync/UpdatePO`;
    const payload = {
      QRCodeId: scannedData.qrCodeId || scannedData.id,
      EnteredQty: parseInt(enteredQty, 10)
    };
    const response = await axios.post(url, payload);
    const data = response.data;
    if (data.statusCode === 200 || data.status === 'Qty Updated') {
      // Update the scanned data with new quantity and status
      setScannedData(prev => ({ 
        ...prev, 
        enteredQty: enteredQty, // Add this line to store entered quantity
        qty: enteredQty,
        quantity: enteredQty,
        status: 'Qty Updated'
      }));
      
      // Clear the input field after successful save
      setEnteredQty('');
      
      alert('Quantity updated successfully!');
    } else {
      throw new Error(data.statusDesc || 'Failed to update quantity');
    }
  } catch (err) {
    setError(err.response?.data?.statusDesc || err.message || 'Failed to update quantity');
  } finally {
    setUpdateLoading(false);
  }
};

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

const getDisplayQuantity = () => {
  if (!scannedData) return 'N/A';
  
  console.log("Scanned Data fields:", Object.keys(scannedData));
  console.log("Scanned Data:", scannedData);
  
  if (scannedData.status === 'Qty Updated') {
    // Try different possible field names for entered quantity
    return scannedData.enteredQty || scannedData.EnteredQty || scannedData.enteredQuantity || scannedData.updatedQty || scannedData.qty || scannedData.quantity || 'N/A';
  } else {
    return scannedData.quantity || scannedData.qty || 'N/A';
  }
};
  // Render purchase order details
  const renderPurchaseOrderDetails = (data) => {
    if (!data) return null;

    const details = [
      { 
        label: "Enter the Quantity", 
        value: (
          <div style={styles.quantityInputContainer}>
            <input
              type="number"
              value={enteredQty}
              onChange={(e) => setEnteredQty(e.target.value)}
              placeholder="Enter new quantity"
              style={styles.quantityInputField}
            />
          </div>
        )
      },
      { icon: <FileText size={16} color="#3B82F6" />, label: "PO Number", value: data.poNumber || 'N/A' },
      { icon: <Calendar size={16} color="#10B981" />, label: "PO Date", value: formatDate(data.poDate) },
      { icon: <User size={16} color="#8B5CF6" />, label: "Customer", value: data.customer || 'N/A' },
      { icon: <Package size={16} color="#F59E0B" />, label: "Product Code", value: data.productCode || 'N/A' },
      { icon: <FileText size={16} color="#EF4444" />, label: "Job", value: data.job || 'N/A' },
      { 
        icon: <Package size={16} color="#8B5CF6" />, 
        label: "Quantity", 
        value: (
          <div style={styles.quantityDisplayContainer}>
            <span style={styles.quantityValue}>{getDisplayQuantity()}</span>
          </div>
        )
      },
      { icon: <CheckCircle size={16} color="#10B981" />, label: "Status", value: data.status || 'N/A' }
    ];

    return (
      <div style={styles.detailsContainer}>
        <div style={styles.detailsHeader}>
          <FileText size={18} color="#000080" />
          <span style={styles.detailsTitle}>Purchase Order Details</span>
        </div>
        <div style={styles.detailsGrid}>
          {details.map((detail, index) => (
            <div key={index} style={styles.detailItem}>
              {detail.icon && <div style={styles.detailIcon}>{detail.icon}</div>}
              <div style={styles.detailContent}>
                <div style={styles.detailLabel}>{detail.label}</div>
                <div style={styles.detailValue}>{detail.value}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Save Button below Status */}
        <div style={styles.saveButtonContainer}>
          <button 
            onClick={updatePOQuantity} 
            disabled={updateLoading || !enteredQty}
            style={styles.mainSaveButton}
          >
            {updateLoading ? <Loader size={16} /> : <Save size={16} />}
            {updateLoading ? 'Saving...' : 'Save Quantity'}
          </button>
        </div>

        <div style={styles.successMessage}>
          <CheckCircle size={16} color="#10B981" />
          <span>QR code scanned successfully!</span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.content}>
          <div style={styles.iconContainer} onClick={handleScanClick}>
            <div style={styles.scannerIcon}>
              <ScanIcon size={36} color="#3B82F6" />
            </div>
          </div>

          <button 
            style={{
              ...styles.mainScanButton,
              ...(loading && styles.buttonDisabled)
            }} 
            onClick={handleScanClick} 
            disabled={loading}
          >
            {loading ? <Loader size={16} /> : <ScanIcon size={16} />}
            {loading ? 'Scanning...' : 'Scan QR Code'}
          </button>

          {!hasCamera && <div style={styles.warningText}>Camera not available</div>}

          {scannedData && renderPurchaseOrderDetails(scannedData)}

          {error && (
            <div style={styles.errorContainer}>
              <div style={styles.errorHeader}>
                <X size={16} color="#EF4444" />
                <span style={styles.errorText}>Error</span>
              </div>
              <p style={styles.errorMessage}>{error}</p>
            </div>
          )}
        </div>
      </div>

      {isScanning && (
        <div style={styles.scannerOverlay}>
          <div style={styles.scannerHeader}>
            <button style={styles.closeButton} onClick={handleCloseScanner}>
              <X size={20} color="#FFFFFF" />
            </button>
            <h2 style={styles.scannerTitle}>QR Scanner</h2>
            <div style={styles.placeholder}></div>
          </div>

          <div style={styles.tabContentContainer}>
            <div style={styles.tabContent}>
              <div style={styles.cameraContainer}>
                {cameraError ? (
                  <div style={styles.cameraError}>
                    <CameraOff size={48} color="#EF4444" />
                    <p style={styles.cameraErrorText}>{cameraError}</p>
                    <button style={styles.retryButton} onClick={startCamera}>
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      style={styles.cameraVideo} 
                      playsInline 
                      muted 
                      autoPlay
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {!cameraReady && !cameraError && (
                      <div style={styles.cameraLoading}>
                        <Loader size={32} color="#3B82F6" />
                        <p style={styles.loadingText}>Initializing camera...</p>
                      </div>
                    )}
                    
                    <div style={styles.scannerFrame}>
                      <div style={styles.cornerTL}></div>
                      <div style={styles.cornerTR}></div>
                      <div style={styles.cornerBL}></div>
                      <div style={styles.cornerBR}></div>
                    </div>
                    
                    {cameraReady && (
                      <div style={styles.scanningStatus}>
                        <Loader size={16} color="#3B82F6" />
                        <p style={styles.scanningText}>Scanning for QR codes...</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    width: '100%',
    maxWidth: '500px',
    overflow: 'hidden',
  },
  content: {
    padding: '24px 20px',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: '24px',
    cursor: 'pointer',
  },
  scannerIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: '#f8fafc',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
    border: '1px solid #e2e8f0',
  },
  mainScanButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '0 auto',
    width: '60%',
    maxWidth: '200px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  warningText: {
    color: '#EF4444',
    fontSize: '12px',
    marginTop: '8px',
  },
  scannerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  scannerHeader: {
    padding: '16px',
    paddingTop: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  placeholder: {
    width: '32px',
  },
  tabContentContainer: {
    flex: 1,
    padding: '20px',
  },
  tabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cameraContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '300px',
  },
  cameraVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cameraLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#ffffff',
  },
  loadingText: {
    marginTop: '8px',
    fontSize: '14px',
  },
  scannerFrame: {
    width: '250px',
    height: '250px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    borderRadius: '12px',
  },
  scanningStatus: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '8px 16px',
    borderRadius: '20px',
    color: '#ffffff',
  },
  scanningText: {
    margin: 0,
    fontSize: '14px',
  },
  cameraError: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
    color: '#ffffff',
    padding: '20px',
  },
  cameraErrorText: {
    fontSize: '14px',
    margin: 0,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  detailsContainer: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  detailsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0',
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000080',
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  detailIcon: {
    padding: '6px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
  },
  detailContent: {
    flex: 1,
    textAlign: 'left',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '4px',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  quantityInputContainer: {
    width: '100%',
  },
  quantityInputField: {
    width: '80%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  quantityDisplayContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quantityValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  saveButtonContainer: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  mainSaveButton: {
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '150px',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
    color: '#166534',
  },
  errorContainer: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  errorText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#EF4444',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#DC2626',
    margin: 0,
  },
  cornerTL: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    width: '20px',
    height: '20px',
    borderTop: '3px solid #3B82F6',
    borderLeft: '3px solid #3B82F6',
  },
  cornerTR: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderTop: '3px solid #3B82F6',
    borderRight: '3px solid #3B82F6',
  },
  cornerBL: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    width: '20px',
    height: '20px',
    borderBottom: '3px solid #3B82F6',
    borderLeft: '3px solid #3B82F6',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderBottom: '3px solid #3B82F6',
    borderRight: '3px solid #3B82F6',
  },
};

export default ScanSimple;