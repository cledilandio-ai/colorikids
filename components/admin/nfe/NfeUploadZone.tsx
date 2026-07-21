"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, FileUp } from "lucide-react";

interface NfeUploadZoneProps {
    onFileSelect: (file: File) => void;
    loading: boolean;
}

export function NfeUploadZone({ onFileSelect, loading }: NfeUploadZoneProps) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragIn = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragOut = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml")) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleRemove = useCallback(() => {
        setSelectedFile(null);
        setFileInputKey((k) => k + 1);
    }, []);

    return (
        <div className="space-y-4">
            {/* Estado: Nenhum arquivo selecionado */}
            {!selectedFile && (
                <div
                    onDragEnter={handleDragIn}
                    onDragLeave={handleDragOut}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`
                        relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200
                        ${dragOver
                            ? "border-pink-400 bg-pink-50 shadow-lg shadow-pink-100 scale-[1.02]"
                            : "border-gray-300 bg-gray-50 hover:border-pink-300 hover:bg-pink-50/50"
                        }
                    `}
                >
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" />
                            <span className="text-sm font-medium text-gray-600">Processando XML...</span>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
                                <Upload className="h-8 w-8 text-pink-600" />
                            </div>
                            <p className="mb-1 text-lg font-semibold text-gray-700">
                                Solte o XML da NF-e aqui
                            </p>
                            <p className="mb-4 text-sm text-gray-500">
                                ou clique no botão abaixo para selecionar o arquivo
                            </p>
                            <p className="mb-4 text-xs text-gray-400">
                                Apenas arquivos .xml — Máx. 5MB
                            </p>

                            {/* ─── INPUT OVERLAY ──────────────────────────────
                                 O input type=file fica com opacidade 0 e
                                 posicionado ABSOLUTAMENTE em cima do botão.
                                 O clique vai DIRETO no input do navegador.
                                 Não precisa de label, ref, ou JavaScript. */}
                            <div className="relative inline-block">
                                <input
                                    key={fileInputKey}
                                    type="file"
                                    accept=".xml,text/xml,application/xml"
                                    onChange={handleFileSelected}
                                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                />
                                <div className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-pink-700">
                                    <FileUp className="h-4 w-4" />
                                    Selecionar Arquivo XML
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Estado: Arquivo selecionado */}
            {selectedFile && (
                <div className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-green-50 p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                            <FileText className="h-7 w-7 text-green-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Overlay para trocar arquivo */}
                        <div className="relative inline-block">
                            <input
                                key={fileInputKey + 100}
                                type="file"
                                accept=".xml,text/xml,application/xml"
                                onChange={handleFileSelected}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            />
                            <div className="cursor-pointer rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100">
                                Trocar arquivo
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="Remover arquivo"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
