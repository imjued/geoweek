'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addWeeks, format, startOfWeek, subWeeks, getMonth, getWeekOfMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Save, Download, Loader2, Database, FolderKanban, Calendar as CalendarIcon, Upload, CloudDownload } from 'lucide-react';
import { generateDocx } from '@/lib/docxGenerator'; // Need to move this or re-create
import { useRef } from 'react';


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
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(addWeeks(new Date(), 1));
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<{ id: string, name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableProjects(data);
      })
      .catch(console.error);
  }, []);

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const displayMonth = getMonth(selectedDate) + 1;
  const displayWeek = getWeekOfMonth(selectedDate, { weekStartsOn: 1 });

  const [showCalendar, setShowCalendar] = useState(false);
  const [reportDates, setReportDates] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Fetch Report Dates for Calendar
  useEffect(() => {
    if (showCalendar) {
      fetch('/api/reports/status')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setReportDates(data);
        })
        .catch(console.error);
    }
  }, [showCalendar]);

  // Calendar Logic
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 })
  });

  function endOfWeek(date: Date, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }) {
    // simple helper since we didn't import endOfWeek
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < (options?.weekStartsOn || 0) ? 7 : 0) + 6 - day + (options?.weekStartsOn || 0);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const handleDateSelect = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    setSelectedDate(addWeeks(weekStart, 1)); // Logic in handleNext/Prev seems to imply selectedDate is +1 week ahead? 
    // Wait, let's check existing logic:
    // const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    // If selectedDate is today, startOfWeek gives this Monday.
    // The handlePrev/Next logic uses subWeeks(d, 1).
    // So if I pick a date, I should just set selectedDate to that date?
    // Let's assume selectedDate is the target reference date.
    setSelectedDate(date);
    setShowCalendar(false);
  };

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

  const handleBackup = () => {
    window.open('/api/backup', '_blank');
  };

  const handleDownload = async () => {
    // Logic to trigger docx download
    // We need to re-implement generateDocx on client side
    // Because `docx` runs on client fine.
    await generateDocx({ selectedDate, items });
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('DB를 복원하면 기존 데이터와 병합되거나 덮어씌워질 수 있습니다. 진행하시겠습니까?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });

        if (res.ok) {
          alert('복원이 완료되었습니다. 페이지를 새로고침합니다.');
          window.location.reload();
        } else {
          alert('복원 실패');
        }
      } catch (error) {
        console.error('File parsing error', error);
        alert('잘못된 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Import Projects Handler
  const handleImportProjects = async () => {
    if (!confirm('외부 DB(gannt-j)에서 프로젝트를 가져오시겠습니까? 중복된 프로젝트는 건너뜁니다.')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/projects/import', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`${data.count}개의 프로젝트를 성공적으로 가져왔습니다.`);
        // Refresh projects list
        fetch('/api/projects')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setAvailableProjects(data);
          })
          .catch(console.error);
      } else {
        alert('프로젝트 가져오기 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // UI Handlers
  // UI Handlers
  const handlePrev = () => setSelectedDate((d: Date) => subWeeks(d, 1));
  const handleNext = () => setSelectedDate((d: Date) => addWeeks(d, 1));

  const updateItem = (id: string, field: keyof ReportItem, value: string) => {
    setItems((prev: ReportItem[]) => prev.map((item: ReportItem) => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems((prev: ReportItem[]) => [...prev, {
      id: crypto.randomUUID(),
      division: '기획실',
      project: '',
      prev_progress: '',
      curr_progress: '',
      remarks: ''
    }]);
  };

  const removeItem = (id: string) => {
    setItems((prev: ReportItem[]) => prev.filter((i: ReportItem) => i.id !== id));
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center py-10 px-4 sm:px-8">
      {/* Header Area */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">주간 업무 보고서</h1>
          <p className="text-neutral-500 mt-1">팀 업무 진행상황 공유 및 관리</p>
        </div>

        <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-neutral-200">
          <button onClick={handlePrev} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 transition">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center min-w-[140px] cursor-pointer hover:bg-neutral-50 rounded-lg px-2 py-1 transition-colors relative group" onClick={() => setShowCalendar(!showCalendar)}>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-widest flex items-center justify-center gap-1">
              Week of <CalendarIcon size={10} />
            </div>
            <div className="text-lg font-bold text-neutral-800 tabular-nums">
              {weekStart}
            </div>
            <div className="text-xs text-neutral-500 font-medium mt-1">
              {displayMonth}월 {displayWeek}주차
            </div>
          </div>
          <button onClick={handleNext} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 transition">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowCalendar(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 w-[360px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-lg"><ChevronLeft size={20} /></button>
              <h3 className="font-bold text-lg">{format(calendarMonth, 'yyyy년 M월')}</h3>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-lg"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 text-center mb-2">
              {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                <div key={d} className="text-xs font-medium text-neutral-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day: Date, i: number) => {
                const isSelected = isSameWeek(day, selectedDate, { weekStartsOn: 1 });
                const dayString = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const hasReport = reportDates.includes(dayString);

                return (
                  <button
                    key={i}
                    onClick={() => handleDateSelect(day)}
                    className={`
                                        h-10 rounded-lg flex flex-col items-center justify-center relative transition-all
                                        ${!isSameMonth(day, calendarMonth) ? 'text-neutral-300' : 'text-neutral-700'}
                                        ${isSelected ? 'bg-neutral-900 text-white shadow-md' : 'hover:bg-neutral-100'}
                                        ${isToday(day) && !isSelected ? 'text-blue-600 font-bold' : ''}
                                    `}
                  >
                    <span className="text-sm">{format(day, 'd')}</span>
                    {hasReport && (
                      <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowCalendar(false)} className="mt-4 w-full py-2 text-sm text-neutral-500 hover:bg-neutral-50 rounded-lg">닫기</button>
          </div>
        </div>
      )}

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
              onClick={() => router.push('/projects')}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
            >
              <FolderKanban size={16} />
              <span>프로젝트 관리</span>
            </button>
            <button
              onClick={handleImportProjects}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
              title="외부 DB에서 프로젝트 가져오기"
            >
              <CloudDownload size={16} />
              <span>가져오기</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
            >
              <Download size={16} />
              <span>워드 다운로드</span>
            </button>
            <button
              onClick={handleBackup}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
              title="DB 백업 다운로드"
            >
              <Database size={16} />
            </button>
            <button
              // hidden input trigger
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
              title="DB 복원"
            >
              <Upload size={16} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleRestoreFile}
            />
          </div>
        </div>

        {/* List */}
        <div className="p-6 space-y-6">
          {items.map((item: ReportItem, idx: number) => (
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
                    <select
                      value={item.project}
                      onChange={(e) => updateItem(item.id, 'project', e.target.value)}
                      className="w-full text-sm font-medium text-neutral-800 bg-neutral-50 border-0 rounded-md p-2 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all appearance-none"
                    >
                      <option value="">프로젝트 선택</option>
                      {availableProjects.map((p: { id: string, name: string }) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                      {/* Maintain legacy or custom values not in the list */}
                      {item.project && !availableProjects.find((p: { id: string, name: string }) => p.name === item.project) && (
                        <option value={item.project}>{item.project}</option>
                      )}
                    </select>
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
