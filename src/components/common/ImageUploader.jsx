import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, User, Loader2, Sparkles } from 'lucide-react';
import { compressAndCropImage, getDataUrlSizeKb } from '../../utils/imageUtils';
import { showToast } from './ToastNotification';

const ImageUploader = ({
  value,
  onChange,
  disabled = false,
  label = 'Foto de Perfil',
  sizePx = 90,
  rounded = '16px',
  placeholderIcon: PlaceholderIcon = User
}) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      showToast('Formato no válido', 'Por favor selecciona un archivo de imagen (JPG, PNG, WebP).', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const optimizedDataUrl = await compressAndCropImage(file, {
        maxDimension: 360,
        quality: 0.84,
        format: 'image/webp'
      });

      const sizeKb = getDataUrlSizeKb(optimizedDataUrl);
      onChange(optimizedDataUrl);

      showToast(
        'Foto Optimizada',
        `Imagen cargada y comprimida con éxito (${sizeKb} KB).`,
        'success',
        3000
      );
    } catch (err) {
      console.error('[ImageUploader] Error al procesar imagen:', err);
      showToast('Error', 'No se pudo procesar la imagen seleccionada.', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && <label className="input-label" style={{ marginBottom: 0 }}>{label}</label>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Contenedor Avatar Interactivo */}
        <div
          onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            width: `${sizePx}px`,
            height: `${sizePx}px`,
            borderRadius: rounded,
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            overflow: 'hidden',
            border: isDragging
              ? '2px dashed #10B981'
              : value
              ? '2px solid rgba(16, 185, 129, 0.5)'
              : '2px dashed rgba(255, 255, 255, 0.2)',
            background: isDragging
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
          title={disabled ? undefined : 'Haz clic o arrastra una imagen para cambiar la foto'}
        >
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#10B981' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Procesando...</span>
            </div>
          ) : value ? (
            <img
              src={value}
              alt="Foto de perfil"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#94A3B8' }}>
              <PlaceholderIcon size={sizePx * 0.38} color="#64748B" />
              <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600 }}>Subir foto</span>
            </div>
          )}

          {/* Overlay Hover en desktop */}
          {!disabled && !isProcessing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(6, 13, 30, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                color: '#F8FAFC'
              }}
              className="uploader-overlay"
            >
              <Camera size={22} color="#10B981" />
            </div>
          )}
        </div>

        {/* Acciones y Detalles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={disabled || isProcessing}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={14} color="#10B981" />
              {value ? 'Cambiar Foto' : 'Seleccionar Foto'}
            </button>

            {value && !disabled && (
              <button
                type="button"
                className="btn-danger"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={handleRemove}
                title="Quitar foto"
              >
                <Trash2 size={13} /> Quitar
              </button>
            )}
          </div>

          <span style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: '1.3' }}>
            Formatos JPG, PNG, WebP o Cámara del móvil. Se auto-comprime a tamaño óptimo.
          </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={disabled || isProcessing}
      />

      <style>{`
        .uploader-overlay:hover {
          opacity: 1 !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageUploader;
