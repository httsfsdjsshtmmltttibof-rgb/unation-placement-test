import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  LayoutDashboard,
  KeyRound,
  Users,
  Settings as SettingsIcon,
  Plus,
  Copy,
  Trash2,
  Download,
  Search,
  Check,
  RefreshCw,
  LogOut,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from 'lucide-react';
import { adminApi } from '../lib/api';
import { AdminStats, TestIdRecord, StudentRecord } from '../types';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('unation_admin_token'));
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'ids' | 'students' | 'settings'>('overview');

  // Admin Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [testIds, setTestIds] = useState<TestIdRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Loading & Filtering
  const [dataLoading, setDataLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  // Generation Modal / Controls
  const [generateCount, setGenerateCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Stats
  const loadDashboardData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [statsData, settingsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSettings(),
      ]);
      setStats(statsData);
      setSettings(settingsData);
    } catch (e: any) {
      if (e.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch IDs
  const loadIds = useCallback(async () => {
    try {
      setDataLoading(true);
      const data = await adminApi.getIds({
        status: statusFilter,
        search: searchId,
      });
      setTestIds(data);
    } catch (e: any) {
      if (e.response?.status === 401) handleLogout();
    } finally {
      setDataLoading(false);
    }
  }, [statusFilter, searchId]);

  // Fetch Students
  const loadStudents = useCallback(async () => {
    try {
      setDataLoading(true);
      const data = await adminApi.getStudents({
        level: levelFilter,
        search: searchStudent,
      });
      setStudents(data);
    } catch (e: any) {
      if (e.response?.status === 401) handleLogout();
    } finally {
      setDataLoading(false);
    }
  }, [levelFilter, searchStudent]);

  useEffect(() => {
    if (token) {
      if (activeTab === 'overview') loadDashboardData();
      else if (activeTab === 'ids') loadIds();
      else if (activeTab === 'students') loadStudents();
      else if (activeTab === 'settings') adminApi.getSettings().then(setSettings).catch(() => {});
    }
  }, [token, activeTab, loadDashboardData, loadIds, loadStudents]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const data = await adminApi.login(username, password);
      localStorage.setItem('unation_admin_token', data.token);
      setToken(data.token);
      setPassword('');
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unation_admin_token');
    setToken(null);
  };

  const handleGenerateIds = async () => {
    setGenerating(true);
    try {
      await adminApi.generateIds(generateCount);
      setGenerateCount(1);
      loadIds();
      adminApi.getStats().then(setStats).catch(() => {});
    } catch (e) {
      alert('Error generating IDs');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeId = async (code: string) => {
    if (!confirm(`Are you sure you want to revoke unused ID "${code}"?`)) return;
    try {
      await adminApi.revokeId(code);
      loadIds();
      adminApi.getStats().then(setStats).catch(() => {});
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to revoke ID');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleHistory = async () => {
    const current = settings.history_enabled !== 'false';
    const nextVal = current ? 'false' : 'true';
    try {
      await adminApi.updateSetting('history_enabled', nextVal);
      setSettings(prev => ({ ...prev, history_enabled: nextVal }));
    } catch (e) {
      alert('Could not update history display setting');
    }
  };

  // If not logged in, render Admin Login Card
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-brand-red text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-red/20 mb-3">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Portal</h1>
            <p className="text-xs text-gray-500">UNATION English Placement Platform</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="bg-white rounded-3xl p-6 sm:p-8 card-elevation border border-gray-100 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-sm transition button-3d"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <p className="text-[11px] text-gray-400 text-center">
            Default credentials for local testing: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono">admin / admin24</code>
          </p>
        </div>
      </div>
    );
  }

  const isHistoryVisible = settings.history_enabled !== 'false';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-brand-red/20">
              <img
                src="https://i.postimg.cc/nLbBRfQP/photo-2021-04-03-05-52-16.jpg"
                alt="UNATION"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-brand-red uppercase">UNATION ENGLISH</span>
              <h2 className="text-sm font-black text-gray-900 leading-none">Administration Suite</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-brand-red hover:border-red-200 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto flex gap-2 mt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'overview'
                ? 'bg-brand-red text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('ids')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ids'
                ? 'bg-brand-red text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Test IDs</span>
          </button>

          {isHistoryVisible && (
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'students'
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student History</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'settings'
                ? 'bg-brand-red text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-8 flex-1">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold text-gray-400">Total Generated IDs</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{stats?.total_ids ?? 0}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">{stats?.unused_ids ?? 0} available for use</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold text-gray-400">Active Sessions</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{stats?.in_progress ?? 0}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Tests currently in progress</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold text-gray-400">Completed Tests</p>
                <p className="text-3xl font-black text-brand-red mt-1">{stats?.completed_tests ?? 0}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Finalized results</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold text-gray-400">Average Score</p>
                <p className="text-3xl font-black text-gray-900 mt-1">
                  {stats?.average_score ?? 0} <span className="text-xs font-normal text-gray-400">/ 120</span>
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Across all candidates</p>
              </div>
            </div>

            {/* Level Distribution Chart Cards */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-red" />
                <span>Proficiency Level Distribution</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
                {Object.entries(stats?.level_distribution || {
                  'Beginner': 0,
                  'Elementary': 0,
                  'Pre-intermediate': 0,
                  'Intermediate': 0,
                  'Upper Intermediate': 0,
                  'Advanced': 0,
                }).map(([lvl, count]) => (
                  <div key={lvl} className="p-3 bg-gray-50 rounded-2xl text-center border border-gray-100">
                    <p className="text-2xl font-black text-gray-900">{count}</p>
                    <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate">{lvl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. TEST IDS TAB */}
        {activeTab === 'ids' && (
          <div className="space-y-6">
            {/* Generation Bar */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Generate New Test IDs</h3>
                <p className="text-xs text-gray-400">Create unique one-time access codes for upcoming students</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={generateCount}
                  onChange={e => setGenerateCount(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value={1}>1 ID</option>
                  <option value={5}>5 IDs</option>
                  <option value={10}>10 IDs</option>
                  <option value={25}>25 IDs</option>
                  <option value={50}>50 IDs</option>
                </select>

                <button
                  onClick={handleGenerateIds}
                  disabled={generating}
                  className="px-5 py-2 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs flex items-center gap-1.5 button-3d"
                >
                  <Plus className="w-4 h-4" />
                  <span>{generating ? 'Generating...' : 'Generate'}</span>
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchId}
                  onChange={e => setSearchId(e.target.value)}
                  placeholder="Search by ID code or candidate name..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="unused">Unused (Available)</option>
                <option value="reserved">In Progress</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>

              <button
                onClick={loadIds}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* IDs Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Test Code</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Assigned Student</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {testIds.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No test IDs found. Click "Generate" to create new test IDs.
                        </td>
                      </tr>
                    ) : (
                      testIds.map(t => (
                        <tr key={t.id || t.code} className="hover:bg-gray-50/60 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900 tracking-wider">
                            {t.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                t.status === 'unused'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : t.status === 'reserved'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : t.status === 'completed'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-700">
                            {t.student_name || <span className="text-gray-300 font-normal">—</span>}
                          </td>
                          <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleCopy(t.code)}
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
                              title="Copy ID to clipboard"
                            >
                              {copiedId === t.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {t.status === 'unused' && (
                              <button
                                onClick={() => handleRevokeId(t.code)}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-red-500 transition"
                                title="Revoke ID"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. STUDENT HISTORY TAB */}
        {activeTab === 'students' && isHistoryVisible && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                    placeholder="Search candidate name or test ID..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>

                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                >
                  <option value="all">All Levels</option>
                  <option value="Beginner">Beginner (0-20)</option>
                  <option value="Elementary">Elementary (21-35)</option>
                  <option value="Pre-intermediate">Pre-intermediate (36-60)</option>
                  <option value="Intermediate">Intermediate (61-85)</option>
                  <option value="Upper Intermediate">Upper Intermediate (86-100)</option>
                  <option value="Advanced">Advanced (101-120)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={adminApi.getExportUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 shadow-sm transition w-full sm:w-auto"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export CSV</span>
                </a>

                <button
                  onClick={loadStudents}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Student Name</th>
                      <th className="py-3.5 px-4">Test ID</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4">Level</th>
                      <th className="py-3.5 px-4">Duration</th>
                      <th className="py-3.5 px-4">Completed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No student records found.
                        </td>
                      </tr>
                    ) : (
                      students.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/60 transition">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {s.students?.full_name || 'Anonymous Student'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-600 text-[11px]">
                            {s.test_id_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900">{s.score}</span>
                            <span className="text-gray-400 text-[10px]"> / 120</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-red-light text-brand-red">
                              {s.level}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                            {Math.round(s.duration_seconds / 60)} min
                          </td>
                          <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                            {new Date(s.completed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">System Configuration</h3>

              {/* Toggle History Feature */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-gray-900">Student History Browsing Display</p>
                  <p className="text-xs text-gray-500">
                    Controls visibility of the student history tab in this admin dashboard. Disabling this hides the browsing interface while preserving all secure underlying records in the database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHistory}
                  className="text-brand-red hover:opacity-80 transition"
                >
                  {isHistoryVisible ? (
                    <ToggleRight className="w-10 h-10 text-brand-red" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Password update instruction */}
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-900">Admin Password Security</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  To rotate your production administrator password, execute the setup script:
                </p>
                <pre className="p-3 bg-gray-50 rounded-xl text-[11px] font-mono text-gray-800 border border-gray-200 overflow-x-auto mt-2">
                  cd backend && npx ts-node src/scripts/setup-admin.ts NewSecurePassword
                </pre>
                <p className="text-[11px] text-gray-400 pt-1">
                  Then update <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">ADMIN_PASSWORD_HASH</code> in your server environment variables.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
