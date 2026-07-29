
import React, { useEffect, useState } from 'react';

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showInstallBtn, setShowInstallBtn] = useState(false);
    const [showIOSHint, setShowIOSHint] = useState(false);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        // Check if iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        setIsAppInstalled(isStandalone);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!isStandalone) {
                setShowInstallBtn(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
            alert('تم تثبيت تطبيق عون وسند — شكراً لدعمك');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstallBtn(false);
            }
        } else if (isIOS) {
            setShowIOSHint(true);
        }
    };

    if (isAppInstalled) return null;

    if (!showInstallBtn && !isIOS) return null;

    return (
        <>
            {/* Install Button */}
            {(showInstallBtn || isIOS) && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 9999,
                }}>
                    <button
                        onClick={handleInstallClick}
                        className="bg-[#2E8B57] hover:bg-[#257345] text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <span>📥</span>
                        <span>تثبيت التطبيق</span>
                    </button>
                </div>
            )}

            {/* iOS Helper Modal */}
            {showIOSHint && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-t-2xl sm:rounded-2xl max-w-sm w-full animate-slide-up sm:animate-fade-in relative">
                        <button
                            onClick={() => setShowIOSHint(false)}
                            className="absolute top-2 left-4 text-gray-500 hover:text-gray-800 text-xl"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-[#2E8B57] text-right">طريقة تثبيت التطبيق</h3>
                        <div className="text-right space-y-3 text-gray-700">
                            <p>.اضغط على زر المشاركة في شريط المتصفح أسفل الشاشة <span className="text-2xl">⚡</span></p>
                            <p>."Add to Home Screen" ثم اختر <span className="text-2xl">📱</span></p>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={() => setShowIOSHint(false)}
                                className="w-full bg-gray-100 text-[#2E8B57] font-semibold py-2 rounded-lg"
                            >
                                حسناً، فهمت
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
