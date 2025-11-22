import React, { useState, useEffect, useRef } from "react";
import { Scan as ScanIcon, CheckCircle, X, Loader, FileText, Calendar, User, Package, Edit, Save, Camera, CameraOff, Image, Search, Languages } from "lucide-react";
import axios from 'axios';
import API_BASE_URL from './apiConfig';
import { useLocation } from "react-router-dom";
import jsQR from "jsqr";

const Scan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [enteredQty, setEnteredQty] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  
  const location = useLocation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Check if device has camera
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasCamera(videoDevices.length > 0);
          console.log("📷 Camera check:", videoDevices.length > 0 ? "Available" : "Not available");
        } else {
          setHasCamera(false);
        }
      } catch (err) {
        console.log('Camera check failed:', err);
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  // Enhanced QR ID extraction from URL
  const getQRIdFromURL = () => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    // Check for QRid in path
    if (currentPath.includes('QRid=')) {
      const qrIdMatch = currentPath.match(/QRid=([^\/]+)/);
      if (qrIdMatch && qrIdMatch[1]) {
        return qrIdMatch[1];
      }
    }

    // Check for UUID in path
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pathSegments = currentPath.split('/').filter(segment => segment);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    if (uuidRegex.test(lastSegment)) {
      return lastSegment;
    }

    // Check query parameters
    const queryQRId = searchParams.get('QRid');
    if (queryQRId) {
      return queryQRId;
    }

    return null;
  };

  // Handle auto-scan from URL
  useEffect(() => {
    const extractedQRId = getQRIdFromURL();
    if (extractedQRId) {
      handleAutoScan(extractedQRId);
    }
  }, [location]);

  const handleAutoScan = async (qrId) => {
    setLoading(true);
    setError('');
    try {
      await callQRApi(qrId);
    } catch (err) {
      setError('Auto scan failed: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  // SIMPLIFIED QR ID extraction
  const extractQRIdFromScannedData = (scannedText) => {
    console.log("🔍 Raw QR data:", scannedText);
    
    // First, try to find any UUID pattern
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = scannedText.match(uuidPattern);
    if (uuidMatch) {
      console.log("✅ Found UUID:", uuidMatch[0]);
      return uuidMatch[0];
    }

    // Try QRid pattern
    const qrIdPattern = /QRid=([^&]+)/i;
    const qrIdMatch = scannedText.match(qrIdPattern);
    if (qrIdMatch && qrIdMatch[1]) {
      console.log("✅ Found QRid:", qrIdMatch[1]);
      return qrIdMatch[1];
    }

    // If it's a URL, try to get the last segment
    if (scannedText.includes('/')) {
      const segments = scannedText.split('/').filter(seg => seg);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        console.log("✅ Using last URL segment:", lastSegment);
        return lastSegment;
      }
    }

    // If nothing else works, return the raw text
    console.log("✅ Using raw text:", scannedText);
    return scannedText;
  };

  // SIMPLE QR SCANNING FUNCTION
  const startQRScanning = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log("❌ Video or canvas not ready");
      return;
    }

    console.log("🔄 Starting QR scanning...");
    
    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    scanIntervalRef.current = setInterval(() => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          return;
        }

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
          
          if (code) {
            console.log("🎯 QR Code Found:", code.data);
            const extractedId = extractQRIdFromScannedData(code.data);
            console.log("📋 Extracted ID for API:", extractedId);
            
            // Stop scanning and call API
            stopQRScanning();
            callQRApi(extractedId);
          }
        }
      } catch (err) {
        console.error("❌ Scanning error:", err);
      }
    }, 500); // Check every 500ms
  };

  const stopQRScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      console.log("🛑 QR scanning stopped");
    }
  };

  // Scan QR from image file
  const scanQRFromImage = (file) => {
    if (!file) return;

    setLoading(true);
    setError('');

    const img = new Image();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        
        const imageData = context.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, img.width, img.height, {
          inversionAttempts: 'dontInvert',
        });
        
        if (code) {
          console.log("🎯 QR Code from image:", code.data);
          const extractedId = extractQRIdFromScannedData(code.data);
          callQRApi(extractedId);
        } else {
          setError('No QR code found in the image');
          setLoading(false);
        }
      } catch (err) {
        console.error('Image QR scanning error:', err);
        setError('Failed to scan QR code from image');
        setLoading(false);
      }
    };

    img.onerror = () => {
      setError('Failed to load image');
      setLoading(false);
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      scanQRFromImage(file);
    }
    event.target.value = '';
  };

  // Open gallery/file picker
  const handleGalleryScan = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // FIXED CAMERA FUNCTION
  const startCamera = async () => {
    try {
      console.log("📹 Starting camera...");
      setCameraError('');
      setCameraReady(false);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not supported in this browser');
        return false;
      }

      // Stop existing stream
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
        
        // Wait for video to be ready
        videoRef.current.onloadeddata = () => {
          console.log("✅ Camera video loaded");
          setCameraReady(true);
          startQRScanning();
        };

        videoRef.current.onerror = (error) => {
          console.error("❌ Video error:", error);
          setCameraError('Failed to load camera video');
        };

        // Fallback: if onloadeddata doesn't fire, start after a timeout
        setTimeout(() => {
          if (!cameraReady) {
            console.log("🔄 Fallback: Starting camera after timeout");
            setCameraReady(true);
            startQRScanning();
          }
        }, 2000);
      }
      
      return true;
    } catch (err) {
      console.error('❌ Camera access error:', err);
      let errorMessage = 'Cannot access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported in this browser.';
      } else {
        errorMessage = `Camera error: ${err.message}`;
      }
      
      setCameraError(errorMessage);
      return false;
    }
  };

  const stopCamera = () => {
    console.log("🛑 Stopping camera...");
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

  // Main scan button click
  const handleScanClick = async () => {
    console.log("🎬 Scan button clicked");
    setIsScanning(true);
    setError('');
    setCameraError('');
    setActiveTab('search');
    
    if (hasCamera) {
      console.log("📷 Has camera, starting...");
      await startCamera();
    } else {
      console.log("❌ No camera available");
      setCameraError('No camera available on this device');
    }
  };

  // Close scanner
  const handleCloseScanner = () => {
    console.log("🔒 Closing scanner");
    setIsScanning(false);
    setLoading(false);
    stopCamera();
  };

  // CALL QR API
  const callQRApi = async (id) => {
    setLoading(true);
    setError('');
    try {
      console.log("🚀 Calling API with ID:", id);
      
      // Clean the API base URL
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = `${baseUrl}/api/posync/QR?id=${encodeURIComponent(id)}`;
      
      console.log("📡 API URL:", url);
      
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;
      
      console.log("✅ API Response:", data);
      
      setScannedData(data);
      setEnteredQty(data.qty?.toString() || '');
      
      // Close scanner if open
      if (isScanning) {
        setIsScanning(false);
        stopCamera();
      }
      
    } catch (err) {
      console.error('❌ API Error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.statusDesc || err.message || 'Failed to fetch data';
      setError(`API Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Update PO quantity
  const updatePOQuantity = async () => {
    if (!enteredQty || !scannedData) return;
    setUpdateLoading(true);
    setError('');
    try {
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = `${baseUrl}/api/posync/UpdatePO`;
      const extractedQRId = getQRIdFromURL() || scannedData.qrCodeId || scannedData.id;
      const payload = {
        QRCodeId: extractedQRId,
        EnteredQty: parseInt(enteredQty, 10)
      };
      const response = await axios.post(url, payload);
      const data = response.data;
      if (data.statusCode === 200 || data.status === 'Qty Updated') {
        setScannedData(prev => ({ ...prev, qty: enteredQty }));
        setIsEditing(false);
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

  // Render purchase order details
  const renderPurchaseOrderDetails = (data) => {
    if (!data) return null;

    const details = [
      { icon: <FileText size={16} color="#3B82F6" />, label: "PO Number", value: data.poNumber || 'N/A' },
      { icon: <Calendar size={16} color="#10B981" />, label: "PO Date", value: formatDate(data.poDate) },
      { icon: <User size={16} color="#8B5CF6" />, label: "Customer", value: data.customer || 'N/A' },
      { icon: <Package size={16} color="#F59E0B" />, label: "Product Code", value: data.productCode || 'N/A' },
      { icon: <FileText size={16} color="#EF4444" />, label: "Job", value: data.job || 'N/A' },
      { 
        icon: <Package size={16} color="#8B5CF6" />, 
        label: "Quantity", 
        value: isEditing ? (
          <div style={styles.quantityEditContainer}>
            <input
              type="number"
              value={enteredQty}
              onChange={(e) => setEnteredQty(e.target.value)}
              style={styles.quantityInput}
            />
            <button onClick={updatePOQuantity} disabled={updateLoading} style={styles.saveButton}>
              {updateLoading ? <Loader size={14} /> : <Save size={14} />}
            </button>
            <button onClick={() => setIsEditing(false)} style={styles.cancelButton}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={styles.quantityDisplayContainer}>
            <span>{data.qty || data.quantity || 'N/A'}</span>
            <button onClick={() => setIsEditing(true)} style={styles.editButton}>
              <Edit size={14} />
            </button>
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
              <div style={styles.detailIcon}>{detail.icon}</div>
              <div style={styles.detailContent}>
                <div style={styles.detailLabel}>{detail.label}</div>
                <div style={styles.detailValue}>{detail.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.successMessage}>
          <CheckCircle size={16} color="#10B981" />
          <span>QR code scanned successfully!</span>
        </div>
      </div>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'search':
        return (
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
            <div style={styles.tabHint}>Point camera at QR code</div>
          </div>
        );
      
      case 'create':
        return (
          <div style={styles.tabContent}>
            <div style={styles.gallerySection}>
              <div style={styles.galleryContainer} onClick={handleGalleryScan}>
                <div style={styles.galleryContent}>
                  <Image size={48} color="#8B5CF6" />
                  <p style={styles.galleryText}>Choose from Gallery</p>
                  <p style={styles.gallerySubtext}>Select image with QR code</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div style={styles.tabContent}>
            <div style={styles.comingSoonContainer}>
              <p style={styles.comingSoonText}>Feature coming soon</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileSelect} />

      {getQRIdFromURL() && !scannedData && (
        <div style={styles.qrIdInfo}>
          QR Code Detected: {getQRIdFromURL()}
          {loading && <Loader size={14} />}
        </div>
      )}

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

          <div style={styles.tabContainer}>
            {['search', 'translate', 'live', 'create'].map(tab => (
              <button 
                key={tab} 
                style={{
                  ...styles.tabButton,
                  ...(activeTab === tab && styles.tabButtonActive)
                }} 
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'search' && <Search size={18} />}
                {tab === 'translate' && <Languages size={18} />}
                {tab === 'live' && <Camera size={18} />}
                {tab === 'create' && <Image size={18} />}
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            ))}
          </div>

          <div style={styles.tabContentContainer}>
            {renderTabContent()}
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
  qrIdInfo: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '8px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
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
  tabContainer: {
    display: 'flex',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '8px',
    margin: '0 16px',
    borderRadius: '12px',
  },
  tabButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    padding: '12px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3B82F6',
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
  tabHint: {
    color: '#ffffff',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '16px',
    opacity: 0.8,
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
  gallerySection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  galleryContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    border: '2px dashed rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
  },
  galleryContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
    color: '#ffffff',
    padding: '20px',
  },
  galleryText: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  gallerySubtext: {
    fontSize: '12px',
    margin: 0,
    opacity: 0.8,
  },
  comingSoonContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
  comingSoonText: {
    fontSize: '16px',
    opacity: 0.8,
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
  quantityEditContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quantityInput: {
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    width: '80px',
  },
  quantityDisplayContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    backgroundColor: '#f3f4f6',
  },
  saveButton: {
    background: '#10B981',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
  },
  cancelButton: {
    background: '#EF4444',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
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
};

export default Scan;