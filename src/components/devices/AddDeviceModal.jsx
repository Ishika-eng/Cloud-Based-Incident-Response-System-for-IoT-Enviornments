import React, { useState } from 'react';
import { X, Server, Plus } from 'lucide-react';
import Button from '../ui/Button';
import { addDevice } from '../../services/api';
import { toast } from '../ui/Toast';
import { DEVICE_TYPES } from '../../constants/deviceTypes';

const AddDeviceModal = ({ isOpen, onClose, onRefresh }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        ip: '',
        type: DEVICE_TYPES.RASPBERRY_PI_4,
        location: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.ip) {
            toast.error('Name and IP are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            await addDevice(formData);
            toast.success('Device provisioned successfully!');
            onRefresh();
            onClose();
        } catch (err) {
            toast.error('Failed to add device.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0d1117] border border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.15)] w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200" style={{ borderRadius: '0' }}>

                <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between shrink-0 bg-[#00ff41]/10">
                    <div className="flex items-center gap-3">
                        <Server className="text-[#00ff41]" size={18} />
                        <h2 className="text-[14px] font-bold text-[#e6edf3] font-mono uppercase tracking-wider">Provision New Device</h2>
                    </div>
                    <button onClick={onClose} className="text-[#8b949e] hover:text-[#00ff41] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[#00ff41] mb-2">Device Name</label>
                        <input
                            type="text"
                            placeholder="e.g. SENSOR-NODE-99"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full h-[36px] px-3 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-[13px] font-mono focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] transition-all"
                            style={{ borderRadius: '0' }}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[#00ff41] mb-2">IPv4 Address</label>
                        <input
                            type="text"
                            placeholder="e.g. 192.168.1.100"
                            value={formData.ip}
                            onChange={e => setFormData({ ...formData, ip: e.target.value })}
                            className="w-full h-[36px] px-3 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-[13px] font-mono focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] transition-all"
                            style={{ borderRadius: '0' }}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[#00ff41] mb-2">Hardware Type</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            className="w-full h-[36px] px-2 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-[13px] font-mono focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] transition-all"
                            style={{ borderRadius: '0' }}
                        >
                            {Object.values(DEVICE_TYPES).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[#00ff41] mb-2">Physical Location</label>
                        <input
                            type="text"
                            placeholder="e.g. Server Rack B"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full h-[36px] px-3 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-[13px] font-mono focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] transition-all"
                            style={{ borderRadius: '0' }}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-none border border-[#30363d]">
                            Cancel
                        </Button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41] hover:bg-[#00ff41] hover:text-black font-mono font-bold text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Deploying...' : <><Plus size={16} /> Deploy</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDeviceModal;
