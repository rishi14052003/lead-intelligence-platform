import React from 'react';
import '../../styles/skeleton.css';

interface SkeletonLoaderProps {
  count?: number;
  variant?: 'row' | 'card';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  count = 5, 
  variant = 'row' 
}) => {
  if (variant === 'card') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-short"></div>
            <div className="skeleton-line skeleton-short"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-cell skeleton-avatar"></div>
          <div className="skeleton-cell skeleton-text"></div>
          <div className="skeleton-cell skeleton-text"></div>
          <div className="skeleton-cell skeleton-text"></div>
          <div className="skeleton-cell skeleton-text"></div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
