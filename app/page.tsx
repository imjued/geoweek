'use client';

import { useState, useEffect } from 'react';
import { addWeeks, format, startOfWeek, subWeeks, getWeekOfMonth, getMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Save, Download, Loader2, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import { generateDocx } from '@/lib/docxGenerator'; // Need to move this or re-create


// Moving types here or importing
export interface ReportItem {
  id: string;
  division: string;
  project: string;
  prev_progress: string; // Adjusted to match DB
  curr_progress: string; // Adjusted to match DB
  remarks: string;
}

interface Project {
  id: string;
  name: string;
  client: string;
  pm: string;
  period: string;
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(addWeeks(new Date(), 1));
  const [items, setItems] = useState<ReportItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', client: '', pm: '', period: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch Data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Reports
        const res = await fetch(`/api/reports?weekStart=${weekStart}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Reports API Error: ${res.status} - ${text}`);
        }
        const data = await res.json();

        // Fetch Projects
        const projRes = await fetch('/api/projects');
        if (!projRes.ok) {
          console.error("Projects API Error:", await projRes.text());
        } else {
          const projData = await projRes.json();
          if (projData.projects) {
            setProjects(projData.projects);
          }
        }

        if (data.items && data.items.length > 0) {
          setItems(data.items);
        } else {
          // Default to empty item if list is empty
          setItems([{
            id: crypto.randomUUID(),
            division: '기획실', // Default Division
            project: '',
            prev_progress: '',
            curr_progress: '',
            remarks: ''
          }]);
        }
      } catch (e) {
        console.error("Failed to fetch data:", e);
        // Do not crash the entire app, just log
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [weekStart]);

  const handleAddProject = async () => {
    if (!newProject.name) return alert("프로젝트명을 입력해주세요.");
    try {
      await fetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProject)
      });
      // Refresh projects
      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      setProjects(projData.projects || []);
      setNewProject({ name: '', client: '', pm: '', period: '' });
      setIsProjectModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("프로젝트 추가 실패");
    }
  };

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
    await generateDocx({ selectedDate, items });
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveAs(blob, `backup-${format(new Date(), 'yyyy-MM-dd')}.json`);
    } catch (e) {
      console.error(e);
      alert('백업 실패');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('정말로 복원하시겠습니까? 현재 데이터가 모두 삭제됩니다.')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/restore', {
          method: 'POST',
          body: JSON.stringify(json)
        });
        if (res.ok) {
          alert('복원 완료. 페이지를 새로고침합니다.');
          window.location.reload();
        } else {
          throw new Error('Restore failed');
        }
      } catch (err) {
        console.error(err);
        alert('복원 실패. 파일 형식을 확인해주세요.');
      }
    };
    reader.readAsText(file);
  };

  // UI Handlers
  const handlePrev = () => setSelectedDate(d => subWeeks(d, 1));
  const handleNext = () => setSelectedDate(d => addWeeks(d, 1));

  const updateItem = (id: string, field: keyof ReportItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    const lastItem = items[items.length - 1];
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      division: lastItem ? lastItem.division : '기획실',
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
            <div className="relative group cursor-pointer" onClick={() => (document.getElementById('hidden-date-picker') as HTMLInputElement)?.showPicker()}>
              <input
                id="hidden-date-picker"
                type="date"
                className="absolute opacity-0 pointer-events-none"
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value);
                    if (!isNaN(date.getTime())) {
                      setSelectedDate(date);
                    }
                  }
                }}
              />
              <div className="text-lg font-bold text-neutral-800 tabular-nums group-hover:text-blue-600 transition-colors">
                {getMonth(selectedDate) + 1}월 {getWeekOfMonth(selectedDate, { weekStartsOn: 1 })}주차
              </div>
              <div className="text-xs font-medium text-neutral-400 mt-0.5 group-hover:text-blue-400 transition-colors">
                ({weekStart})
              </div>
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
              {items.length} Items
            </span>
            {loading && <span className="flex items-center text-sm text-neutral-400"><Loader2 className="animate-spin mr-2 h-3 w-3" /> Loading...</span>}
          </div>
          <div className="flex space-x-3">
            {/* Backup/Restore */}
            <div className="flex items-center space-x-2 border-r border-neutral-200 pr-3 mr-1">
              <button onClick={handleBackup} title="데이터 백업" className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors">
                <Download size={18} />
              </button>
              <label title="데이터 복원" className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer">
                <Upload size={18} />
                <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
              </label>
            </div>

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
              <span>워드 다운로드</span>
            </button>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              <span>프로젝트 관리</span>
            </button>
          </div>
        </div>

        {isProjectModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <h2 className="text-xl font-bold mb-4">프로젝트 등록</h2>
              <div className="space-y-4">
                <input className="w-full border p-2 rounded" placeholder="프로젝트명" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
                <input className="w-full border p-2 rounded" placeholder="발주처" value={newProject.client} onChange={e => setNewProject({ ...newProject, client: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input className="w-full border p-2 rounded" placeholder="PM" value={newProject.pm} onChange={e => setNewProject({ ...newProject, pm: e.target.value })} />
                  <input className="w-full border p-2 rounded" placeholder="사업기간" value={newProject.period} onChange={e => setNewProject({ ...newProject, period: e.target.value })} />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 rounded">취소</button>
                <button onClick={handleAddProject} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">등록</button>
              </div>
              <div className="mt-8">
                <h3 className="text-sm font-bold text-neutral-500 mb-2">등록된 프로젝트 목록</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {projects.map(p => (
                    <div key={p.id} className="text-sm p-2 bg-neutral-50 rounded border flex justify-between">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-neutral-400 text-xs">{p.client} / {p.pm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    <div className="relative">
                      <select
                        value={item.project}
                        onChange={(e) => updateItem(item.id, 'project', e.target.value)}
                        className="w-full text-sm font-medium text-neutral-800 bg-neutral-50 border-0 rounded-md p-2 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all appearance-none"
                      >
                        <option value="">프로젝트 선택...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                      </div>
                    </div>
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
