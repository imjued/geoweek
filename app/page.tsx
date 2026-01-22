'use client';

import { useState, useEffect } from 'react';
import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Save, Download, Loader2 } from 'lucide-react';
import { generateDocx } from '@/lib/docxGenerator'; // Need to move this or re-create
import type { ReportItem } from '@/types';

// Moving types here or importing
export interface ReportItem {
  id: string;
  division: string;
  project: string;
  prev_progress: string; // Adjusted to match DB
  curr_progress: string; // Adjusted to match DB
  remarks: string;
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(addWeeks(new Date(), 1));
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch Data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?weekStart=${weekStart}`);
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        } else {
          setItems([]); // Should ideally be handled by API returning []
        }
      } catch (e) {
        console.error("Failed to fetch", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [weekStart]);

  // Save Data
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, items })
      });
      // Maybe show toast? Use simple alert for now or just button state
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    // Logic to trigger docx download
    // We need to re-implement generateDocx on client side
    // Because `docx` runs on client fine.
    await generateDocx({ selectedDate, items });
  };

  // UI Handlers
  const handlePrev = () => setSelectedDate(d => subWeeks(d, 1));
  const handleNext = () => setSelectedDate(d => addWeeks(d, 1));

  const updateItem = (id: string, field: keyof ReportItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      division: '',
      project: '',
      prev_progress: '',
      curr_progress: '',
      remarks: ''
    }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center py-10 px-4 sm:px-8">
      {/* Header Area */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">주간 업무 보고서</h1>
          <p className="text-neutral-500 mt-1">팀 업무 진행상황 공유 및 관리</p>
        </div>

        {/* Date Control */}
        <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-neutral-200">
          <button onClick={handlePrev} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 transition">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center min-w-[140px]">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Week of</div>
            <div className="text-lg font-bold text-neutral-800 tabular-nums">
              {weekStart}
            </div>
          </div>
          <button onClick={handleNext} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 transition">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden min-h-[600px]">
        {/* Toolbar */}
        <div className="border-b border-neutral-100 p-4 bg-white sticky top-0 z-10 flex justify-between items-center backdrop-blur-xl bg-white/80">
          <div className="flex space-x-2">
            <span className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
              {items.length} Projects
            </span>
            {loading && <span className="flex items-center text-sm text-neutral-400"><Loader2 className="animate-spin mr-2 h-3 w-3" /> Loading...</span>}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
              <span>저장하기</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
            >
              <Download size={16} />
              <span>워드 다운로드</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-6 space-y-6">
          {items.map((item, idx) => (
            <div key={item.id} className="group relative border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-colors bg-white">
              {/* Item Number */}
              <div className="absolute top-4 right-4 text-xs font-bold text-neutral-300">#{idx + 1}</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Meta Column */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Division</label>
                    <input
                      value={item.division}
                      onChange={(e) => updateItem(item.id, 'division', e.target.value)}
                      className="w-full text-sm font-medium text-neutral-800 bg-neutral-50 border-0 rounded-md p-2 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      placeholder="부서명"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Project</label>
                    <input
                      value={item.project}
                      onChange={(e) => updateItem(item.id, 'project', e.target.value)}
                      className="w-full text-sm font-medium text-neutral-800 bg-neutral-50 border-0 rounded-md p-2 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      placeholder="프로젝트명"
                    />
                  </div>
                </div>

                {/* Progress Column */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Previous Week</label>
                    <textarea
                      value={item.prev_progress}
                      onChange={(e) => updateItem(item.id, 'prev_progress', e.target.value)}
                      className="w-full h-32 text-sm text-neutral-600 bg-neutral-50 border-0 rounded-md p-3 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none leading-relaxed"
                      placeholder="- 지난주 진행사항"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">This Week</label>
                    <textarea
                      value={item.curr_progress}
                      onChange={(e) => updateItem(item.id, 'curr_progress', e.target.value)}
                      className="w-full h-32 text-sm text-neutral-600 bg-neutral-50 border-0 rounded-md p-3 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none leading-relaxed"
                      placeholder="- 이번주 진행사항"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Remarks</label>
                    <input
                      value={item.remarks}
                      onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                      className="w-full text-xs text-neutral-500 bg-transparent border-b border-neutral-100 focus:border-neutral-300 focus:ring-0 px-0 py-1 transition-colors hover:border-neutral-200"
                      placeholder="비고..."
                    />
                  </div>
                </div>
              </div>

              {/* Delete Action (Hidden by default, shown on group hover) */}
              <button
                onClick={() => removeItem(item.id)}
                className="absolute -right-2 -top-2 bg-white text-red-400 hover:text-red-500 p-1 rounded-full shadow-sm border border-neutral-200 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ))}

          {/* Empty State */}
          <button
            onClick={addItem}
            className="w-full py-8 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 hover:bg-neutral-50 transition-all group"
          >
            <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <span className="font-medium text-sm">새로운 항목 추가</span>
          </button>
        </div>
      </div>
    </main>
  );
}
