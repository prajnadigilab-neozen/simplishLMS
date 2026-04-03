import { useState, useEffect } from 'react';

/**
 * useNetworkResilience Hook
 * Monitors the "Unstable Last Mile" in rural settings and provides 
 * bandwidth-aware degradation signals.
 * 
 * Returns: { bandwidthMode, isLowBandwidth, networkInfo }
 */
export const useNetworkResilience = () => {
    const [bandwidthMode, setBandwidthMode] = useState('HIGH'); // HIGH | MEDIUM | LOW
    const [isLowBandwidth, setIsLowBandwidth] = useState(false);
    const [networkInfo, setNetworkInfo] = useState({
        downlink: Infinity,
        effectiveType: 'unknown',
        rtt: 0
    });

    useEffect(() => {
        const updateNetworkInfo = () => {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (conn) {
                const { downlink, effectiveType, rtt } = conn;
                setNetworkInfo({ downlink, effectiveType, rtt });

                // Throttling thresholds (in Mbps)
                // LOW: <= 250kbps (0.25 Mbps)
                // MEDIUM: 250kbps to 1.5 Mbps
                // HIGH: > 1.5 Mbps
                if (downlink <= 0.25 || effectiveType === 'slow-2g' || effectiveType === '2g') {
                    setBandwidthMode('LOW');
                    setIsLowBandwidth(true);
                } else if (downlink <= 1.5 || effectiveType === '3g') {
                    setBandwidthMode('MEDIUM');
                    setIsLowBandwidth(false);
                } else {
                    setBandwidthMode('HIGH');
                    setIsLowBandwidth(false);
                }
            }
        };

        // Initial check
        updateNetworkInfo();

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            conn.addEventListener('change', updateNetworkInfo);
            return () => conn.removeEventListener('change', updateNetworkInfo);
        }

        // Generic fallback for browsers without Network Information API
        const handleOnlineStatus = () => {
            if (!navigator.onLine) {
                setBandwidthMode('LOW');
                setIsLowBandwidth(true);
            } else {
                // Without measurements, assume MEDIUM on reconnection for safety
                setBandwidthMode('MEDIUM');
                setIsLowBandwidth(false);
            }
        };

        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);

        return () => {
            window.removeEventListener('online', handleOnlineStatus);
            window.removeEventListener('offline', handleOnlineStatus);
        };
    }, []);

    return { 
        bandwidthMode, 
        isLowBandwidth, 
        networkInfo,
        // Helper to decide if we should hide video
        shouldDegrade: isLowBandwidth || bandwidthMode === 'LOW'
    };
};
