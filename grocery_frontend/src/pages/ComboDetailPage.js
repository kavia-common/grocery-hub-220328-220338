import React, { useEffect, useState, useContext } from 'react';
import { getComboById } from '../services/combosService';
import { useNavigate, useParams } from 'react-router-dom';
import { addToCart } from '../services/productsService';
import { NotificationsContext } from '../notifications/NotificationsContext';
import '../styles.css';

function Breakdown({ combo }) {
  const savings = combo.originalPrice - combo.comboPrice;
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-md border">
      <div className="flex justify-between text-sm text-gray-700">
        <span>Subtotal</span>
        <span>${combo.originalPrice.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm text-green-700 mt-1">
        <span>Savings</span>
        <span>- ${savings.toFixed(2)} ({combo.savingsPercent}%)</span>
      </div>
      <div className="flex justify-between text-base font-semibold text-gray-900 mt-2">
        <span>Combo Price</span>
        <span>${combo.comboPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function ComboDetailPage() {
  const { comboId } = useParams();
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { pushNotification } = useContext(NotificationsContext);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getComboById(comboId).then((data) => {
      if (mounted) {
        setCombo(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [comboId]);

  if (loading) return <div className="p-4">Loading combo...</div>;
  if (!combo) return <div className="p-4">Combo not found.</div>;

  const availableItems = combo.items.filter((i) => (i.stockQty ?? 0) >= (i.qty ?? 1));
  const skipped = combo.items.filter((i) => !availableItems.includes(i));
  const canQuickBuy = combo.availability.allInStock;

  const addComboToCart = async (navigateToCheckout = false) => {
    for (const item of availableItems) {
      try {
        await addToCart(item.productId, item.qty, `(from ${combo.title})`);
      } catch (e) {
        // ignore per-line errors
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
        message: `Skipped out-of-stock item(s): ${skipped.map((s) => s.name).join(', ')}`,
      });
    }
    if (navigateToCheckout && availableItems.length) {
      navigate('/checkout');
    }
  };

  return (
    <div className="p-4">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-lg overflow-hidden border bg-white">
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img src={combo.image_url} alt={`${combo.title} image`} className="w-full h-80 object-cover" />
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <h1 className="text-2xl font-semibold text-gray-900">{combo.title}</h1>
          <p className="text-gray-600 mt-1">{combo.description}</p>
          <div className="mt-3">
            {combo.savingsPercent > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 shadow-sm">
                Save {combo.savingsPercent}%
              </span>
            )}
            {combo.allInstant && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Instant Delivery
              </span>
            )}
            {!combo.availability.allInStock && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Limited availability
              </span>
            )}
          </div>
          <Breakdown combo={combo} />
          <div className="mt-4 flex gap-3">
            <button
              className="px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => addComboToCart(false)}
            >
              Add Combo to Cart
            </button>
            <button
              className={`px-4 py-2 rounded-md ${canQuickBuy ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'} text-white`}
              onClick={() => canQuickBuy && addComboToCart(true)}
              disabled={!canQuickBuy}
              title={!canQuickBuy ? 'Quick Buy disabled due to out-of-stock items' : 'Quick Buy'}
            >
              Quick Buy
            </button>
          </div>
          {!combo.availability.allInStock && (
            <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
              The following items are unavailable and will be skipped:
              <ul className="list-disc ml-6">
                {combo.availability.outOfStockItems.map((i) => (
                  <li key={i.productId}>{i.name} (need {i.qty}, in stock {i.stockQty ?? 0})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">Included Items</h2>
        </div>
        <div className="p-4">
          <ul className="divide-y">
            {combo.items.map((item) => {
              const inStock = (item.stockQty ?? 0) >= (item.qty ?? 1);
              return (
                <li key={item.productId} className="py-3 flex items-center gap-3">
                  {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                  <img src={item.image_url} alt={`${item.name} image`} className="w-14 h-14 rounded object-cover border" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.isInstant && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                          Instant
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Qty: {item.qty} · ${item.price.toFixed(2)} each
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border ${inStock ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                    >
                      {inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
