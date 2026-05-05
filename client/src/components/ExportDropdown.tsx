import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table, File } from 'lucide-react';

type ExportFormat = 'pdf' | 'excel' | 'word';

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
}

export default function ExportDropdown({ onExport, disabled = false }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  const exportOptions = [
    { 
      format: 'pdf' as ExportFormat, 
      label: 'Export as PDF', 
      icon: FileText,
      description: 'Portable document format'
    },
    { 
      format: 'excel' as ExportFormat, 
      label: 'Export as Excel', 
      icon: Table,
      description: 'Spreadsheet format (.xlsx)'
    },
    { 
      format: 'word' as ExportFormat, 
      label: 'Export as Word', 
      icon: File,
      description: 'Document format (.docx)'
    },
  ];

  return (
    <div className="export-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: "nowrap", minHeight: "36px" }}
      >
        <Download size={14} />
        Export
      </button>

      {isOpen && (
        <div className="export-dropdown-menu" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          minWidth: 200,
          zIndex: 1000,
          padding: 8,
        }}>
          {exportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.format}
                className="export-dropdown-item"
                onClick={() => handleExport(option.format)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: 'rgba(108, 99, 255, 0.1)',
                  color: 'var(--accent2)',
                }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {option.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
