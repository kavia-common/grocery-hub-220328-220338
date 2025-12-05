import React from 'react';
import BuyAgain from '../components/BuyAgain';
import './address.css';

/**
 * PUBLIC_INTERFACE
 * Dedicated Buy Again route showing expanded list with default limit.
 */
export default function BuyAgainPage() {
  return (
    <div className="page">
      <h2 style={{ color: '#2563EB' }}>Buy Again</h2>
      <BuyAgain limit={24} />
    </div>
  );
}
