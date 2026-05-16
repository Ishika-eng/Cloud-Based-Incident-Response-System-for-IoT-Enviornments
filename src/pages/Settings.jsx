import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto">
            <div className="mb-6 shrink-0 flex items-center justify-between">
                <h1 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-wide">Settings</h1>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                <Card className="w-64 shrink-0 h-fit">
                    <div className="p-2 flex flex-col gap-1">
                        {['General', 'Alerts', 'API Keys', 'Team'].map(tab => {
                            const id = tab.toLowerCase().replace(' ', '-');
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`text-left px-3 py-2 rounded-[4px] text-13px font-medium transition-colors ${activeTab === id
                                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                <Card className="flex-1 min-w-0">
                    <div className="p-6">
                        {activeTab === 'general' && (
                            <div className="max-w-xl">
                                <h2 className="text-[11px] uppercase tracking-[0.08em] text-[#6e7681] font-medium mb-6">General Settings</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-11px font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Theme</label>
                                        <select className="w-full h-8 px-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[4px] text-13px text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]">
                                            <option value="system">System (Default)</option>
                                            <option value="dark">Dark</option>
                                            <option value="light">Light</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-11px font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Data Retention</label>
                                        <select className="w-full h-8 px-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[4px] text-13px text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]">
                                            <option value="30">30 Days</option>
                                            <option value="90">90 Days</option>
                                            <option value="180">180 Days</option>
                                            <option value="365">1 Year</option>
                                        </select>
                                    </div>

                                    <div className="pt-4">
                                        <Button variant="primary">Save Changes</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'team' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-[11px] uppercase tracking-[0.08em] text-[#6e7681] font-medium">Team Management</h2>
                                    <Button variant="primary">Invite User</Button>
                                </div>

                                <div className="border border-[var(--border-default)] rounded-[6px] overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                                                <th className="px-4 py-2 text-11px font-medium text-[var(--text-secondary)] uppercase tracking-wider">User</th>
                                                <th className="px-4 py-2 text-11px font-medium text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
                                                <th className="px-4 py-2 text-11px font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-default)]">
                                            <tr className="hover:bg-[var(--bg-hover)] transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="text-13px font-medium text-[var(--text-primary)]">Alice Admin</div>
                                                    <div className="text-11px text-[var(--text-muted)]">alice@sentineliq.io</div>
                                                </td>
                                                <td className="px-4 py-3 text-13px text-[var(--text-primary)]">Admin</td>
                                                <td className="px-4 py-3">
                                                    <Button variant="ghost" size="small">Edit</Button>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-[var(--bg-hover)] transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="text-13px font-medium text-[var(--text-primary)]">Bob Viewer</div>
                                                    <div className="text-11px text-[var(--text-muted)]">bob@sentineliq.io</div>
                                                </td>
                                                <td className="px-4 py-3 text-13px text-[var(--text-primary)]">Viewer</td>
                                                <td className="px-4 py-3">
                                                    <Button variant="ghost" size="small">Edit</Button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {(activeTab === 'alerts' || activeTab === 'api-keys') && (
                            <div className="flex items-center justify-center h-48 text-13px text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-[6px]">
                                {activeTab.replace('-', ' ')} settings coming soon.
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Settings;
