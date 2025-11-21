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
  const [scanResult, setScanResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [enteredQty, setEnteredQty] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [hasCamera, setHasCamera] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanningFromGallery, setScanningFromGallery] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'translate', 'live', 'create'
  
  const location = useLocation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);

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
        console.log('Camera check failed:', err);
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  // Enhanced QR ID extraction
  const getQRIdFromURL = () => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    if (currentPath.includes('QRid=')) {
      const qrIdMatch = currentPath.match(/QRid=([^\/]+)/);
      if (qrIdMatch && qrIdMatch[1]) {
        return qrIdMatch[1];
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pathSegments = currentPath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    if (uuidRegex.test(lastSegment)) {
      return lastSegment;
    }

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

  // Extract QR ID from scanned URL
  const extractQRIdFromScannedData = (scannedText) => {
    const patterns = [
      /QRid=([a-f0-9-]+)/i,
      /\/([a-f0-9-]{36})$/i,
      /([a-f0-9-]{8}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{12})/i
    ];

    for (const pattern of patterns) {
      const match = scannedText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return scannedText;
  };

  // Optimized QR Code Scanning Function
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      const scanWidth = 300;
      const scanHeight = 300;
      canvas.width = scanWidth;
      canvas.height = scanHeight;
      
      context.drawImage(video, 0, 0, scanWidth, scanHeight);
      
      const imageData = context.getImageData(0, 0, scanWidth, scanHeight);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code && code.data) {
        console.log("QR Code detected:", code.data);
        const extractedId = extractQRIdFromScannedData(code.data);
        console.log("Extracted ID:", extractedId);
        
        stopQRScanning();
        callQRApi(extractedId);
        return;
      }
    } catch (err) {
      console.error('QR scanning error:', err);
    }

    if (scanningActive) {
      animationFrameRef.current = setTimeout(() => {
        requestAnimationFrame(scanQRCode);
      }, 100);
    }
  };

  const startQRScanning = () => {
    if (!scanningActive) {
      setScanningActive(true);
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
    }
  };

  const stopQRScanning = () => {
    setScanningActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      clearTimeout(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Scan QR from image file
  const scanQRFromImage = (file) => {
    if (!file) return;

    setScanningFromGallery(true);
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
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        
        if (code && code.data) {
          console.log("QR Code detected from image:", code.data);
          const extractedId = extractQRIdFromScannedData(code.data);
          callQRApi(extractedId);
        } else {
          setError('No QR code found in the selected image');
          setLoading(false);
        }
      } catch (err) {
        console.error('Image QR scanning error:', err);
        setError('Failed to scan QR code from image');
        setLoading(false);
      } finally {
        setScanningFromGallery(false);
      }
    };

    img.onerror = () => {
      setError('Failed to load image');
      setLoading(false);
      setScanningFromGallery(false);
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

  // Improved camera access with better error handling
  const startCamera = async () => {
    try {
      setCameraError('');
      setCameraReady(false);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not supported in this browser');
        return false;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraReady(true);
            setTimeout(() => {
              startQRScanning();
            }, 300);
          }).catch(err => {
            console.error('Video play failed:', err);
            setCameraError('Failed to start camera: ' + err.message);
          });
        };

        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setCameraError('Camera error occurred');
        };
      }
      
      return true;
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = 'Cannot access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        errorMessage = 'No suitable camera found.';
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

  // Main scan button click - show scanner overlay with Google Lens style
  const handleScanClick = async () => {
    setIsScanning(true);
    setError('');
    setCameraError('');
    setActiveTab('search');
    
    if (hasCamera) {
      await startCamera();
    }
  };

  // Close scanner and stop camera
  const handleCloseScanner = () => {
    setIsScanning(false);
    setLoading(false);
    stopCamera();
  };

  const callQRApi = async (id) => {
    setLoading(true);
    setError('');
    try {
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = `${baseUrl}/api/posync/QR?id=${id}`;
      
      const response = await axios.get(url);
      const data = response.data;
      
      setScanResult(data);
      setScannedData(data);
      setEnteredQty(data.qty?.toString() || '');
      
      if (isScanning) {
        setIsScanning(false);
        stopCamera();
      }
      
    } catch (err) {
      console.error('QR API Error:', err);
      setError(err.response?.data?.statusDesc || err.message || 'Failed to scan QR code');
    } finally {
      setLoading(false);
      setScanningFromGallery(false);
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

  // Extract and display the specific fields
  const renderPurchaseOrderDetails = (data) => {
    if (!data) return null;

    const poNumber = data.poNumber || 'N/A';
    const poDate = data.poDate || 'N/A';
    const customer = data.customer || 'N/A';
    const productCode = data.productCode || 'N/A';
    const job = data.job || 'N/A';
    const quantity = data.qty || data.quantity || 'N/A';
    const status = data.status || 'N/A';

    const details = [
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
              placeholder="Enter quantity"
            />
            <button
              onClick={updatePOQuantity}
              disabled={updateLoading}
              style={styles.saveButton}
            >
              {updateLoading ? <Loader size={14} /> : <Save size={14} />}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={styles.cancelButton}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={styles.quantityDisplayContainer}>
            <span>{quantity}</span>
            <button
              onClick={() => setIsEditing(true)}
              style={styles.editButton}
            >
              <Edit size={14} />
            </button>
          </div>
        )
      },
      {
        icon: <FileText size={16} color="#3B82F6" />,
        label: "PO Number",
        value: poNumber
      },
      {
        icon: <Calendar size={16} color="#10B981" />,
        label: "PO Date",
        value: formatDate(poDate)
      },
      {
        icon: <User size={16} color="#8B5CF6" />,
        label: "Customer",
        value: customer
      },
      {
        icon: <Package size={16} color="#F59E0B" />,
        label: "Product Code",
        value: productCode
      },
      {
        icon: <FileText size={16} color="#EF4444" />,
        label: "Job",
        value: job
      },
      {
        icon: <CheckCircle size={16} color="#10B981" />,
        label: "Status",
        value: status
      }
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
              <div style={styles.detailIcon}>
                {detail.icon}
              </div>
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

  // Render tab content based on active tab
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
                  <button 
                    style={styles.retryButton}
                    onClick={startCamera}
                  >
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
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  
                  {!cameraReady && (
                    <div style={styles.cameraLoading}>
                      <Loader size={32} color="#3B82F6" style={styles.spinner} />
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
                    <>
                      <div style={styles.scanLine}></div>
                      <div style={styles.scanningStatus}>
                        <Loader size={16} color="#3B82F6" style={styles.spinner} />
                        <p style={styles.scanningText}>Point at a QR code</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div style={styles.tabHint}>
              Point your camera at a QR code to scan automatically
            </div>
          </div>
        );
      
      case 'translate':
        return (
          <div style={styles.tabContent}>
            <div style={styles.comingSoonContainer}>
              <Languages size={64} color="#8B5CF6" />
              <h3 style={styles.comingSoonTitle}>Translate</h3>
              <p style={styles.comingSoonText}>
                Coming soon! This feature will allow you to translate text from QR codes.
              </p>
            </div>
          </div>
        );
      
      case 'live':
        return (
          <div style={styles.tabContent}>
            <div style={styles.comingSoonContainer}>
              <Camera size={64} color="#3B82F6" />
              <h3 style={styles.comingSoonTitle}>Live View</h3>
              <p style={styles.comingSoonText}>
                Coming soon! Real-time QR code detection and scanning.
              </p>
            </div>
          </div>
        );
      
      case 'create':
        return (
          <div style={styles.tabContent}>
            <div style={styles.gallerySection}>
              <div 
                style={styles.galleryContainer}
                onClick={handleGalleryScan}
              >
                <div style={styles.galleryContent}>
                  <Image size={48} color="#8B5CF6" />
                  <p style={styles.galleryText}>Choose from Gallery</p>
                  <p style={styles.gallerySubtext}>Select an image containing QR code</p>
                </div>
              </div>
              
              <div style={styles.galleryHint}>
                Or use the camera above to scan live QR codes
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Hidden file input for gallery */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileSelect}
      />

      {/* Display current QR ID if available */}
      {getQRIdFromURL() && !scannedData && (
        <div style={styles.qrIdInfo}>
          📱 QR Code Detected: {getQRIdFromURL()}
        </div>
      )}

      {/* Main Content Card */}
      <div style={styles.card}>
        <div style={styles.content}>
          {/* Clickable Scanner Icon */}
          <div 
            style={styles.iconContainer}
            onClick={handleScanClick}
          >
            <div style={styles.scannerIcon}>
              <ScanIcon size={36} color="#3B82F6" />
            </div>
          </div>

          <button 
            style={styles.mainScanButton}
            onClick={handleScanClick}
            disabled={loading}
          >
            {loading ? <Loader size={16} /> : <ScanIcon size={16} />}
            {loading ? 'Scanning...' : 'Scan QR Code'}
          </button>

          {!hasCamera && (
            <div style={styles.warningText}>
              Camera not available on this device. You can still scan from gallery.
            </div>
          )}

          {/* Purchase Order Details Display */}
          {scannedData && renderPurchaseOrderDetails(scannedData)}

          {/* Error Display */}
          {error && (
            <div style={styles.errorContainer}>
              <div style={styles.errorHeader}>
                <X size={16} color="#EF4444" />
                <span style={styles.errorText}>Scan Failed</span>
              </div>
              <div style={styles.dataContainer}>
                <p style={styles.errorMessage}>{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Lens Style Scanner Overlay */}
      {isScanning && (
        <div style={styles.scannerOverlay}>
          <div style={styles.scannerHeader}>
            <button style={styles.closeButton} onClick={handleCloseScanner}>
              <X size={20} color="#FFFFFF" />
            </button>
            <h2 style={styles.scannerTitle}>QR Scanner</h2>
            <div style={styles.placeholder}></div>
          </div>

          {/* Tab Navigation */}
          <div style={styles.tabContainer}>
            <button 
              style={{
                ...styles.tabButton,
                ...(activeTab === 'search' ? styles.tabButtonActive : {})
              }}
              onClick={() => setActiveTab('search')}
            >
              <Search size={18} />
              <span>Search</span>
            </button>
            
            <button 
              style={{
                ...styles.tabButton,
                ...(activeTab === 'translate' ? styles.tabButtonActive : {})
              }}
              onClick={() => setActiveTab('translate')}
            >
              <Languages size={18} />
              <span>Translate</span>
            </button>
            
            <button 
              style={{
                ...styles.tabButton,
                ...(activeTab === 'live' ? styles.tabButtonActive : {})
              }}
              onClick={() => setActiveTab('live')}
            >
              <Camera size={18} />
              <span>Live</span>
            </button>
            
            <button 
              style={{
                ...styles.tabButton,
                ...(activeTab === 'create' ? styles.tabButtonActive : {})
              }}
              onClick={() => setActiveTab('create')}
            >
              <Image size={18} />
              <span>Create</span>
            </button>
          </div>

          {/* Tab Content */}
          <div style={styles.tabContentContainer}>
            {renderTabContent()}
          </div>

          <div style={styles.scannerFooter}>
            <p style={styles.scannerHint}>
              {activeTab === 'search' && 'Point camera at QR code to scan'}
              {activeTab === 'translate' && 'Translate text from QR codes'}
              {activeTab === 'live' && 'Real-time QR code detection'}
              {activeTab === 'create' && 'Scan QR codes from images'}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
      `}</style>
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
    transition: 'all 0.2s ease',
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
    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.2s ease',
  },
  warningText: {
    color: '#EF4444',
    fontSize: '12px',
    marginTop: '8px',
  },
  // Scanner Overlay Styles
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
    transition: 'background-color 0.2s ease',
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
  // Tab Navigation
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
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    padding: '12px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3B82F6',
  },
  // Tab Content
  tabContentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
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
  // Camera Section
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
    color: '#ffffff',
  },
  cameraError: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    textAlign: 'center',
    color: '#ffffff',
    padding: '20px',
  },
  cameraErrorText: {
    fontSize: '14px',
    margin: 0,
    textAlign: 'center',
  },
  // Gallery Section
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
    transition: 'all 0.3s ease',
    minHeight: '200px',
  },
  galleryContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  galleryHint: {
    color: '#ffffff',
    fontSize: '14px',
    textAlign: 'center',
    opacity: 0.7,
  },
  // Coming Soon Sections
  comingSoonContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    textAlign: 'center',
    color: '#ffffff',
    padding: '40px 20px',
  },
  comingSoonTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    color: '#ffffff',
  },
  comingSoonText: {
    fontSize: '14px',
    margin: 0,
    opacity: 0.8,
    maxWidth: '300px',
    lineHeight: '1.5',
  },
  // Scanner Footer
  scannerFooter: {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  scannerHint: {
    color: '#ffffff',
    fontSize: '14px',
    marginBottom: '16px',
    opacity: 0.8,
  },
  // Buttons
  retryButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
  },
  // Scanner corners
  cornerTL: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    width: '20px',
    height: '20px',
    borderTop: '3px solid #3B82F6',
    borderLeft: '3px solid #3B82F6',
    borderTopLeftRadius: '6px',
  },
  cornerTR: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderTop: '3px solid #3B82F6',
    borderRight: '3px solid #3B82F6',
    borderTopRightRadius: '6px',
  },
  cornerBL: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    width: '20px',
    height: '20px',
    borderBottom: '3px solid #3B82F6',
    borderLeft: '3px solid #3B82F6',
    borderBottomLeftRadius: '6px',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderBottom: '3px solid #3B82F6',
    borderRight: '3px solid #3B82F6',
    borderBottomRightRadius: '6px',
  },
  scanLine: {
    position: 'absolute',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '2px',
    backgroundColor: '#3B82F6',
    animation: 'scan 2s linear infinite',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  // Purchase Order Details Styles (keep existing)
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
    margin: 0,
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    wordBreak: 'break-word',
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
    fontSize: '14px',
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
    fontSize: '14px',
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: '16px',
    padding: '0',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    overflow: 'hidden',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderBottom: '1px solid #fecaca',
  },
  errorText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#EF4444',
    margin: 0,
  },
  errorMessage: {
    fontSize: '12px',
    color: '#DC2626',
    wordBreak: 'break-all',
    margin: 0,
    padding: '12px',
    lineHeight: '1.4',
  },
};

export default Scan;