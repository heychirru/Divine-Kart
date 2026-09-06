import AddressForm from '@/components/checkout/AddressForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import useLocationStore from '@/store/locationStore';
import { getAddresses } from '@/services/addressService';
import { createOrder, verifyPayment } from '@/services/orderService';
import { PAYMENT_METHODS, ROUTES } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, CreditCard, MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Dynamically load Razorpay checkout script
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// Step progress indicator (matches Stitch design)
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Address' },
    { num: 2, label: 'Payment' },
    { num: 3, label: 'Summary' },
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                currentStep > step.num
                  ? 'bg-primary border-primary text-white'
                  : currentStep === step.num
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {currentStep > step.num ? <Check className="w-4 h-4" strokeWidth={3} /> : step.num}
            </div>
            <span
              className={`mt-1 text-xs font-semibold ${
                currentStep >= step.num ? 'text-primary' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-24 md:w-36 h-0.5 mx-2 mb-5 transition-colors ${
                currentStep > step.num ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, deliveryFee, total, clearCart } = useCart();
  const { location: headerLocation } = useLocationStore();

  const [step, setStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Fetch addresses
  const { data: addressesData, isLoading: loadingAddresses, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: getAddresses,
  });

  const addresses = addressesData?.data || [];
  const selectedAddress = addresses.find(a => a._id === selectedAddressId);

  // Auto-select the first address when addresses are loaded
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses[0]._id);
    }
  }, [addresses, selectedAddressId]);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async (data) => {
      if (!data.razorpay) {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(ROUTES.ORDER_DETAIL.replace(':id', data.order._id));
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        return;
      }

      const { key, amount, currency, order_id, prefill, notes } = data.razorpay;
      const rzp = new window.Razorpay({
        key,
        amount,
        currency,
        order_id,
        name: 'Divine-Kart',
        description: 'Order Payment',
        prefill,
        notes,
        // Enable all payment methods including UPI, cards, netbanking
        config: {
          display: {
            blocks: {
              utib: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
              other: { name: 'Other Payment Modes', instruments: [{ method: 'card' }, { method: 'netbanking' }] },
            },
            sequence: ['block.utib', 'block.other'],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCart();
            toast.success('Payment successful! Order confirmed.');
            navigate(ROUTES.ORDER_DETAIL.replace(':id', data.order._id));
          } catch (err) {
            const msg = err?.response?.data?.message || 'Payment verification failed. Please contact support.';
            toast.error(msg);
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled. Your order is pending payment.');
          },
        },
        theme: { color: '#0c831f' },
      });
      rzp.open();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to place order');
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Enrich shippingAddress with coords for hyperlocal routing.
    // Priority: address GPS → header-selected location GPS → null
    const coords = selectedAddress?.location?.coordinates; // GeoJSON [lng, lat]
    const fallbackLat = headerLocation?.lat ?? null;
    const fallbackLng = headerLocation?.lng ?? null;

    const enrichedAddress = selectedAddress
      ? {
          addressLine: selectedAddress.addressLine,
          city: selectedAddress.city,
          state: selectedAddress.state,
          country: selectedAddress.country,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          lat: coords?.[1] ?? fallbackLat,
          lng: coords?.[0] ?? fallbackLng,
        }
      : selectedAddressId;

    createOrderMutation.mutate({
      items: items.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingAddress: enrichedAddress,
      paymentMethod: selectedPaymentMethod,
      totalAmount: total,
    });
  };

  if (items.length === 0) {
    return (
      <div className="container-custom py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some products to checkout</p>
        <Button onClick={() => navigate(ROUTES.HOME)}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container-custom py-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Step content */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── STEP 1: Delivery Address ──────────────────────── */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Delivery Address
                </h2>
                <button
                  onClick={() => { setEditingAddress(null); setShowAddressModal(true); }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add New Address
                </button>
              </div>

              <div className="p-6">
                {loadingAddresses ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-20 skeleton rounded-lg" />)}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No saved addresses</p>
                    <Button onClick={() => setShowAddressModal(true)}>Add Address</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address._id}
                        className={`flex items-start gap-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedAddressId === address._id
                            ? 'border-primary bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedAddressId(address._id)}
                      >
                        {/* Radio dot */}
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          selectedAddressId === address._id ? 'border-primary bg-primary' : 'border-gray-400'
                        }`}>
                          {selectedAddressId === address._id && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-gray-900">{address.name}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize font-semibold">
                              {address.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{address.addressLine}</p>
                          <p className="text-sm text-gray-600">{address.city}, {address.state} - {address.pincode}</p>
                          <p className="text-sm text-gray-600">Mobile: {address.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {addresses.length > 0 && (
                  <button
                    onClick={() => { setEditingAddress(null); setShowAddressModal(true); }}
                    className="mt-4 w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm font-semibold text-gray-500 hover:border-primary hover:text-primary flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add New Address
                  </button>
                )}
              </div>

              {/* Continue to Payment */}
              {step === 1 && (
                <div className="px-6 pb-6">
                  <button
                    disabled={!selectedAddressId}
                    onClick={() => setStep(2)}
                    className="w-full bg-primary text-white py-3 rounded font-bold text-sm uppercase tracking-widest hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              )}
            </div>

            {/* ── STEP 2: Payment Method ──────────────────────────── */}
            <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden transition-opacity ${step < 2 ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Payment Method
                </h2>
              </div>

              <div className="p-6 space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPaymentMethod === method.id
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedPaymentMethod === method.id ? 'border-primary bg-primary' : 'border-gray-400'
                    }`}>
                      {selectedPaymentMethod === method.id && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="text-2xl">{method.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-24">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-black text-gray-600 uppercase tracking-widest">Order Summary</h2>
              </div>

              {/* Items */}
              <div className="px-5 py-4 space-y-4 max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                    {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Place Order */}
              <div className="px-5 pb-5">
                <button
                  onClick={handlePlaceOrder}
                  disabled={createOrderMutation.isPending || !selectedAddressId || step < 2}
                  className="w-full bg-primary text-white py-3 rounded font-bold text-sm uppercase tracking-widest hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {createOrderMutation.isPending ? 'Placing Order…' : 'Place Order →'}
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  🔒 SSL Secure Payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      <Modal
        isOpen={showAddressModal}
        onClose={() => { setShowAddressModal(false); setEditingAddress(null); }}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
        size="lg"
      >
        <AddressForm
          address={editingAddress}
          onSuccess={() => { setShowAddressModal(false); setEditingAddress(null); refetchAddresses(); }}
          onCancel={() => { setShowAddressModal(false); setEditingAddress(null); }}
        />
      </Modal>
    </div>
  );
};

export default Checkout;
