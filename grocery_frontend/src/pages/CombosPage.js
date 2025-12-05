import React, { useEffect, useState, useContext } from 'react';
import { listCombos } from '../services/combosService';
import { NotificationsContext } from '../notifications/NotificationsContext';
import { addToCart } from '../services/productsService';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

function Price({ combo }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xl font-semibold text-blue-600">${combo.comboPrice.toFixed(2)}</span>
      <span className="text-gray-400 line-through">${combo.originalPrice.toFixed(2)}</span>
      {combo.savingsPercent > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 shadow-sm">
          Save {combo.savingsPercent}%
        </span>
      )}
      {combo.allInstant && (
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">
          Instant Delivery
        </span>
      )}
    </div>
  );
}

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { pushNotification } = useContext(NotificationsContext);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    listCombos().then((data) => {
      if (mounted) {
        setCombos(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const addComboToCart = async (combo) => {
    const availableItems = combo.items.filter((i) => (i.stockQty ?? 0) >= (i.qty ?? 1));
    const skipped = combo.items.filter((i) => !availableItems.includes(i));

    for (const item of availableItems) {
      try {
        await addToCart(item.productId, item.qty, `(from ${combo.title})`);
      } catch (e) {
        // ignore single failures
      }
    }

    if (availableItems.length) {
      pushNotification({
        type: 'success',
        message: `Added ${availableItems.length} item(s) from "${combo.title}" to cart.`,
      });
    }
    if (skipped.length) {
      pushNotification({
        type: 'warning',
        message: `Some items were out of stock and skipped: ${skipped.map((s) => s.name).join(', ')}`,
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading combos...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Combos</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="rounded-lg bg-white shadow-sm border border-gray-100 overflow-hidden flex flex-col"
          >
            <div className="h-40 bg-gray-50">
              {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
              <img
                src={combo.image_url}
                alt={`${combo.title} cover`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h2 className="text-lg font-medium text-gray-900">{combo.title}</h2>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {combo.items.map((i) => `${i.qty} x ${i.name}`).join(' · ')}
              </p>
              <Price combo={combo} />
              {!combo.availability.allInStock && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded mt-2 px-2 py-1">
                  {combo.availability.partiallyAvailable
                    ? 'Partial availability'
                    : 'Some items are out of stock'}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-3">
                <button
                  className="flex-1 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                  onClick={() => navigate(`/combos/${combo.id}`)}
                >
                  View Details
                </button>
                <button
                  className="flex-1 px-3 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition"
                  onClick={() => addComboToCart(combo)}
                >
                  Add Combo to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
