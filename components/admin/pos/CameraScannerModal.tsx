"use client";

import { useState, useEffect, useRef } from "react";
import { X, Camera, RefreshCw, Volume2, CheckCircle2, AlertCircle } from "lucide-react";

interface CameraScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (scannedText: string) => void;
}

export function CameraScannerModal({ isOpen, onClose, onScan }: CameraScannerModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Reproduzir sinal sonoro (Beep) via Web Audio API sem depender de arquivo externo
    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // Nota C6
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    // Iniciar câmera quando o modal abre
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            return;
        }

        startCamera();

        return () => {
            stopCamera();
        };
    }, [isOpen, facingMode]);

    const startCamera = async () => {
        setCameraError(null);
        setScanning(true);

        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                startScanningLoop();
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError(
                "Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou o HTTPS."
            );
            setScanning(false);
        }
    };

    const stopCamera = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setScanning(false);
    };

    const toggleFacingMode = () => {
        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    };

    // Loop contínuo de detecção de QR Code / Código de Barras
    const startScanningLoop = () => {
        let lastScanTime = 0;

        const scanFrame = async () => {
            if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
                animationFrameRef.current = requestAnimationFrame(scanFrame);
                return;
            }

            const now = Date.now();
            // Limitar a análise para ~10 leituras por segundo
            if (now - lastScanTime > 100) {
                lastScanTime = now;

                try {
                    // Testar se o navegador suporta a API nativa BarcodeDetector
                    if ("BarcodeDetector" in window) {
                        const formats = ["qr_code", "code_128", "code_39", "ean_13", "ean_8"];
                        const detector = new (window as any).BarcodeDetector({ formats });
                        const barcodes = await detector.detect(videoRef.current);

                        if (barcodes.length > 0) {
                            const rawValue = barcodes[0].rawValue?.trim();
                            if (rawValue) {
                                handleDetectedCode(rawValue);
                                return; // Pausa breve após detectar
                            }
                        }
                    }
                } catch (e) {
                    // Ignore frame scan errors
                }
            }

            animationFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    const handleDetectedCode = (code: string) => {
        stopCamera();
        playBeep();
        setScannedResult(code);
        onScan(code);

        // Feedback rápido e fecha ou reinicia
        setTimeout(() => {
            setScannedResult(null);
            onClose();
        }, 1200);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 text-white shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-800 p-4">
                    <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-pink-500" />
                        <h3 className="text-base font-bold">Leitor de QR Code / Câmera</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFacingMode}
                            className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                            title="Alternar Câmera"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Área da Câmera */}
                <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                    {cameraError ? (
                        <div className="p-6 text-center text-red-400 space-y-3">
                            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
                            <p className="text-sm font-medium">{cameraError}</p>
                            <button
                                onClick={startCamera}
                                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                playsInline
                                muted
                                className="h-full w-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Moldura Guia de Leitura */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                                <div className="relative h-64 w-64 rounded-2xl border-2 border-pink-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
                                    {/* Linha laser animada */}
                                    <div className="absolute left-2 right-2 h-0.5 bg-pink-500 shadow-[0_0_12px_#ec4899] animate-pulse" />

                                    {/* Cantoneiras */}
                                    <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-pink-500 rounded-tl-xl" />
                                    <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-pink-500 rounded-tr-xl" />
                                    <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-pink-500 rounded-bl-xl" />
                                    <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-pink-500 rounded-br-xl" />
                                </div>
                            </div>

                            {/* Alerta de Leitura com Sucesso */}
                            {scannedResult && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
                                    <CheckCircle2 className="h-16 w-16 text-green-500 animate-bounce" />
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">QR Code Identificado!</p>
                                    <p className="text-lg font-mono font-bold text-green-400 bg-gray-900 px-4 py-2 rounded-lg border border-green-500/30">
                                        {scannedResult}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer instrução */}
                <div className="p-4 bg-gray-900 border-t border-gray-800 text-center">
                    <p className="text-xs text-gray-400">
                        Aproxime a câmera do QR Code impresso na etiqueta do produto para adicionar automaticamente ao carrinho do PDV.
                    </p>
                </div>
            </div>
        </div>
    );
}
