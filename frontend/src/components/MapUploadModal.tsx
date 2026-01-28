import React, { useState, useRef } from 'react';
import { campaignApi } from '../lib/campaigns';

interface MapUploadModalProps {
    campaignId: string;
    onClose: () => void;
    onUploadSuccess: () => void;
}

export default function MapUploadModal({ campaignId, onClose, onUploadSuccess }: MapUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
    const [zIndex, setZIndex] = useState(0);
    const [cols, setCols] = useState(50);
    const [rows, setRows] = useState(50);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseZIndexInput = (value: string): number => {
        const trimmed = value.trim();
        if (trimmed === '') return 0;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        const allowedTypes = ['image/png', 'image/webp', 'image/jpeg'];
        if (selectedFile && allowedTypes.includes(selectedFile.type)) {
            setFile(selectedFile);
            setError(null);

            // Detect dimensions
            const img = new Image();
            img.onload = () => {
                setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = URL.createObjectURL(selectedFile);
        } else {
            setError('Please select a valid image (PNG, WebP, or JPEG).');
            setFile(null);
            setDimensions(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !dimensions) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            const resolvedZIndex = Number.isFinite(zIndex) ? zIndex : 0;

            formData.append('map_file', file);
            formData.append('campaign', campaignId);
            formData.append('z_index', resolvedZIndex.toString());
            formData.append('hex_columns', cols.toString());
            formData.append('hex_rows', rows.toString());
            formData.append('image_width', dimensions.width.toString());
            formData.append('image_height', dimensions.height.toString());

            // Debug: log what we're sending
            console.log('Uploading map with data:', {
                campaignId,
                z_index: resolvedZIndex,
                hex_columns: cols,
                hex_rows: rows,
                image_width: dimensions.width,
                image_height: dimensions.height,
                file: file.name,
            });

            await campaignApi.uploadMapLayer(campaignId, formData);

            onUploadSuccess();
            onClose();
        } catch (err: any) {
            console.error('Upload failed:', err);

            // Try to get the most specific message possible
            let displayMsg = err.message || 'Failed to upload map layer.';

            // If it's a PocketBase error with data
            if (err.data && typeof err.data === 'object' && err.data.data) {
                const fieldErrors = Object.entries(err.data.data)
                    .map(([key, val]: [string, any]) => `${key}: ${val.message || val}`)
                    .join(', ');

                if (fieldErrors) {
                    displayMsg = `Validation Error: ${fieldErrors}`;
                }
            }

            setError(displayMsg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-amber-500">🗺️</span> Upload Map Layer
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Upload a map to expand your campaign world.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Layer Image</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png, image/webp, image/jpeg"
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${file ? 'border-amber-500/50 bg-amber-500/5' : 'border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            {file ? (
                                <div className="space-y-1">
                                    <p className="text-white font-medium">{file.name}</p>
                                    <p className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    {dimensions && (
                                        <p className="text-amber-500 text-xs font-mono">{dimensions.width}x{dimensions.height}px</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-gray-300">Click to select a file</p>
                                    <p className="text-gray-500 text-xs">PNG, WebP, or JPEG (max 20MB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Index (Z)</label>
                            <input
                                type="number"
                                value={zIndex}
                                onChange={(e) => setZIndex(parseZIndexInput(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cols (Q)</label>
                            <input
                                type="number"
                                value={cols}
                                onChange={(e) => setCols(parseInt(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Rows (R)</label>
                            <input
                                type="number"
                                value={rows}
                                onChange={(e) => setRows(parseInt(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            {isUploading ? 'Uploading...' : 'Upload Layer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
