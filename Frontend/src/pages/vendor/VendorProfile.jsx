import useVendorStore from '@/store/vendorStore';
import { getMyStore, updateMyStore, uploadStoreLogo } from '@/services/storeService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Save, Store } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const VendorProfile = () => {
  const { setStore } = useVendorStore();
  const qc = useQueryClient();
  const logoInputRef = useRef(null);

  const { data: storeRes, isLoading } = useQuery({ queryKey: ['vendor-store'], queryFn: getMyStore });
  const store = storeRes?.data;

  const [form, setForm] = useState({
    name: '', description: '', phone: '', email: '', gstin: '',
    street: '', city: '', state: '', pincode: '', serviceRadius: 5,
    lat: '', lng: '',
  });
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name ?? '', description: store.description ?? '',
        phone: store.phone ?? '', email: store.email ?? '', gstin: store.gstin ?? '',
        street: store.address?.street ?? '', city: store.address?.city ?? '',
        state: store.address?.state ?? '', pincode: store.address?.pincode ?? '',
        serviceRadius: store.serviceRadius ?? 5,
        lat: store.location?.coordinates?.[1] ?? '',
        lng: store.location?.coordinates?.[0] ?? '',
      });
      setLogoPreview(store.logo ?? null);
    }
  }, [store]);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => updateMyStore({
      name: form.name, description: form.description, phone: form.phone,
      email: form.email, gstin: form.gstin,
      address: { street: form.street, city: form.city, state: form.state, pincode: form.pincode },
      serviceRadius: Number(form.serviceRadius),
      // Pass lat/lng if provided so backend updates location coordinates
      ...(form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : {}),
    }),
    onSuccess: (data) => { toast.success('Profile updated!'); setStore(data.data); qc.invalidateQueries({ queryKey: ['vendor-store'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const logoMutation = useMutation({
    mutationFn: (file) => uploadStoreLogo(file),
    onSuccess: (data) => {
      toast.success('Logo uploaded!');
      // Only update preview after successful upload
      setLogoPreview(data.data?.logo ?? logoPreview);
      qc.invalidateQueries({ queryKey: ['vendor-store'] });
    },
    onError: () => toast.error('Logo upload failed'),
  });

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Don't set preview immediately — wait for onSuccess
    logoMutation.mutate(file);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;

  const fieldCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Store Profile</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
            {logoPreview ? <img src={logoPreview} alt="Store logo" className="w-full h-full object-cover" /> : <Store className="w-8 h-8 text-gray-300" />}
          </div>
          <button onClick={() => logoInputRef.current?.click()} disabled={logoMutation.isPending}
            className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-400 text-black p-1.5 rounded-full shadow-md transition disabled:opacity-50">
            {logoMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
        <div>
          <p className="font-black text-gray-900">{store?.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {store?.isApproved
              ? <span className="text-green-600 font-semibold">✅ Live</span>
              : <span className="text-yellow-600 font-semibold">⏳ Pending Approval</span>}
          </p>
          <p className="text-xs text-gray-400 mt-1">Click the camera icon to update your logo</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">Store Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Store Name</label><input value={form.name} onChange={update('name')} className={fieldCls} /></div>
            <div><label className={labelCls}>Phone</label><input value={form.phone} onChange={update('phone')} className={fieldCls} /></div>
            <div><label className={labelCls}>Contact Email</label><input type="email" value={form.email} onChange={update('email')} className={fieldCls} /></div>
            <div><label className={labelCls}>GSTIN</label><input value={form.gstin} onChange={update('gstin')} className={fieldCls} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Description</label><textarea value={form.description} onChange={update('description')} rows={3} className={`${fieldCls} resize-none`} /></div>
            <div><label className={labelCls}>Service Radius (km)</label><input type="number" min={1} value={form.serviceRadius} onChange={update('serviceRadius')} className={fieldCls} /></div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">Store Address</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className={labelCls}>Street</label><input value={form.street} onChange={update('street')} className={fieldCls} /></div>
            <div><label className={labelCls}>City</label><input value={form.city} onChange={update('city')} className={fieldCls} /></div>
            <div><label className={labelCls}>State</label><input value={form.state} onChange={update('state')} className={fieldCls} /></div>
            <div><label className={labelCls}>Pincode</label><input value={form.pincode} onChange={update('pincode')} className={fieldCls} /></div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Store Location Coordinates</h3>
          <p className="text-xs text-gray-400 mb-4">
            Update coordinates to improve hyperlocal order routing accuracy.{' '}
            <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">Find your coordinates →</a>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={update('lat')} placeholder="e.g. 22.5726" className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={update('lng')} placeholder="e.g. 88.3639" className={fieldCls} />
            </div>
          </div>
          {store?.location?.coordinates && store.location.coordinates[0] !== 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Current: {store.location.coordinates[1]}, {store.location.coordinates[0]}
            </p>
          )}
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default VendorProfile;

