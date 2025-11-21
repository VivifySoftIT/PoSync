import React, { useState, useEffect } from "react";
import { Scan as ScanIcon, CheckCircle, X, Loader, FileText, Calendar, User, Package } from "lucide-react";
import axios from 'axios';
import API_BASE_URL from './apiConfig';
import localforage from "localforage";

const Scan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);

  // Get JWT token from localforage (consistent with your pattern)
  const getToken = async () => {
    return await localforage.getItem("jwtToken");
  };

  // Handle scan click
  const handleScanClick = () => {
    setIsScanning(true);
    setScannedData(null);
    setError('');
    setScanResult(null);
  };

  // Close scanner
  const handleCloseScanner = () => {
    setIsScanning(false);
    setLoading(false);
  };

  // Call QR API with ID
  const callQRApi = async (id) => {
    setLoading(true);
    setError('');
    
    try {
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = `${baseUrl}/api/posync/QR?id=${id}`;
      
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;
      
      // Handle API response based on your backend structure
      if (data.statusCode === 200) {
        setScanResult(data.result || data);
        setScannedData(data.result || data);
        
        // Auto close after success
        setTimeout(() => {
          setIsScanning(false);
          setLoading(false);
        }, 2000);
        
      } else {
        throw new Error(data.statusDesc || 'Failed to fetch QR data');
      }
      
    } catch (err) {
      console.error('QR API Error:', err);
      setError(err.response?.data?.statusDesc || err.message || 'Failed to scan QR code');
      setLoading(false);
      
      // Auto close on error after delay
      setTimeout(() => {
        setIsScanning(false);
      }, 3000);
    }
  };

  // Simulate QR scan with actual API call
  const simulateScan = () => {
    // Use the ID from your API endpoint
    const sampleId = "4feda705-93c0-6b4e-01cd-cd45cebc5274";
    callQRApi(sampleId);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
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

    // Extract fields from the data object
    const poNumber = data.poNumber || data.PONumber || data.poNumber || 'N/A';
    const poDate = data.poDate || data.PODate || data.poDate || 'N/A';
    const customer = data.customer || data.Customer || data.customerName || 'N/A';
    const productCode = data.productCode || data.ProductCode || data.productCode || 'N/A';

    const details = [
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
      </div>
    );
  };

  // Display raw data for debugging
  const renderRawData = (data) => {
    if (!data) return null;
    
    return (
      <div style={styles.rawDataContainer}>
        <div style={styles.rawDataHeader}>
          <span style={styles.rawDataTitle}>Raw API Response</span>
        </div>
        <pre style={styles.rawDataText}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div style={styles.container}>
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
            style={styles.scanButton}
            onClick={handleScanClick}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
          >
            <ScanIcon size={16} style={styles.buttonIcon} />
            Scan QR Code
          </button>

          {/* Purchase Order Details Display */}
          {scannedData && renderPurchaseOrderDetails(scannedData)}

          {/* Raw Data for Debugging (optional) */}
          {/* {scannedData && renderRawData(scannedData)} */}

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

      {/* Scanner Overlay */}
      {isScanning && (
        <div style={styles.scannerOverlay}>
          <div style={styles.scannerHeader}>
            <button 
              style={styles.closeButton}
              onClick={handleCloseScanner}
              disabled={loading}
            >
              <X size={20} color="#FFFFFF" />
            </button>
            <h2 style={styles.scannerTitle}>Scan QR Code</h2>
            <div style={styles.placeholder}></div>
          </div>

          {/* Scanner View */}
          <div style={styles.scannerView}>
            {loading ? (
              <div style={styles.loadingContainer}>
                <Loader size={48} color="#3B82F6" style={styles.spinner} />
                <p style={styles.loadingText}>Fetching PO Details...</p>
              </div>
            ) : error ? (
              <div style={styles.errorOverlay}>
                <X size={48} color="#EF4444" />
                <p style={styles.errorTextOverlay}>{error}</p>
              </div>
            ) : (
              <>
                <div style={styles.scannerFrame}>
                  <div style={styles.cornerTL}></div>
                  <div style={styles.cornerTR}></div>
                  <div style={styles.cornerBL}></div>
                  <div style={styles.cornerBR}></div>
                </div>
                
                {/* Scanning animation */}
                <div style={styles.scanLine}></div>
              </>
            )}
          </div>

          <div style={styles.scannerFooter}>
            {!loading && !error && (
              <>
                <p style={styles.scannerHint}>
                  Align QR code within the frame to scan
                </p>
                
                {/* Demo scan button */}
                <button 
                  style={styles.simulateButton}
                  onClick={simulateScan}
                  disabled={loading}
                  onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
                  onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3B82F6')}
                >
                  {loading ? 'Scanning...' : 'Scan Demo QR'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
          }
        `}
      </style>
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
  scanButton: {
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
  buttonIcon: {
    marginRight: '4px',
  },
  // Purchase Order Details Styles
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
  // Raw Data Styles (for debugging)
  rawDataContainer: {
    marginTop: '16px',
    padding: '0',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  rawDataHeader: {
    padding: '12px',
    backgroundColor: '#e2e8f0',
    borderBottom: '1px solid #cbd5e1',
  },
  rawDataTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    margin: 0,
  },
  rawDataText: {
    fontSize: '10px',
    color: '#64748b',
    margin: 0,
    padding: '12px',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    maxHeight: '150px',
    overflow: 'auto',
  },
  // Error Styles
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  scannerView: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    margin: '16px',
  },
  scannerFrame: {
    width: '250px',
    height: '250px',
    border: '2px solid #ffffff',
    position: 'relative',
    borderRadius: '12px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: '16px',
    margin: 0,
  },
  errorOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    textAlign: 'center',
  },
  errorTextOverlay: {
    color: '#ffffff',
    fontSize: '16px',
    margin: 0,
    maxWidth: '80%',
  },
  // Scanner corners
  cornerTL: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    width: '30px',
    height: '30px',
    borderTop: '4px solid #3B82F6',
    borderLeft: '4px solid #3B82F6',
    borderTopLeftRadius: '8px',
  },
  cornerTR: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '30px',
    height: '30px',
    borderTop: '4px solid #3B82F6',
    borderRight: '4px solid #3B82F6',
    borderTopRightRadius: '8px',
  },
  cornerBL: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    width: '30px',
    height: '30px',
    borderBottom: '4px solid #3B82F6',
    borderLeft: '4px solid #3B82F6',
    borderBottomLeftRadius: '8px',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '30px',
    height: '30px',
    borderBottom: '4px solid #3B82F6',
    borderRight: '4px solid #3B82F6',
    borderBottomRightRadius: '8px',
  },
  scanLine: {
    position: 'absolute',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '3px',
    backgroundColor: '#3B82F6',
    animation: 'scan 2s linear infinite',
  },
  scannerFooter: {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scannerHint: {
    color: '#ffffff',
    fontSize: '14px',
    marginBottom: '16px',
    opacity: 0.8,
  },
  simulateButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '200px',
    transition: 'all 0.2s ease',
  },
};

export default Scan;