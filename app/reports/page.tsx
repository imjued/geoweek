'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, getMonth, getWeekOfMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowLeft, Download, Copy, Check, Loader2 } from 'lucide-react';
import { generateDocx } from '@/lib/docxGenerator';

export interface ReportItem {
    id: string;
    division: string;
    project: string;
    prev_progress: string;
    curr_progress: string;
    remarks: string;
}

type ReportType = 'weekly' | 'monthly';

export default function ReportsPage() {
    const router = useRouter();
    const [reportType, setReportType] = useState<ReportType>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [items, setItems] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    const weekStartStr = format(start, 'yyyy-MM-dd');

    const displayMonth = getMonth(selectedDate) + 1;
    const displayWeek = getWeekOfMonth(selectedDate, { weekStartsOn: 1 });

    useEffect(() => {
        async function fetchReportData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/reports?weekStart=${weekStartStr}`);
                const data = await res.json();
                if (data.items) {
                    setItems(data.items);
                } else {
                    setItems([]);
                }
            } catch (e) {
                console.error('Failed to fetch report data', e);
            } finally {
                setLoading(false);
            }
        }
        fetchReportData();
    }, [weekStartStr]);

    const handlePrev = () => setSelectedDate(d => subWeeks(d, 1));
    const handleNext = () => setSelectedDate(d => addWeeks(d, 1));
    const handleToday = () => setSelectedDate(new Date());

    const handleDownloadDocx = async () => {
        if (items.length === 0) {
            alert('다운로드할 보고서 데이터가 없습니다.');
            return;
        }
        await generateDocx({ selectedDate, items });
    };

    const generateReportText = () => {
        const titleDateStr = `${format(start, 'M월 d일')} - ${format(end, 'M월 d일')}`;
        let text = `[주간 업무 보고] (${titleDateStr})\n\n`;

        if (items.length === 0) {
            text += '해당 주차에 작성된 업무 보고가 없습니다.\n';
            return text;
        }

        items.forEach((item) => {
            if (!item.project && !item.curr_progress && !item.prev_progress) return;

            const projectName = item.project || '기타 업무';
            text += `■ ${projectName}\n`;

            if (item.curr_progress) {
                const lines = item.curr_progress.split('\n').filter(l => l.trim().length > 0);
                lines.forEach(line => {
                    text += `  - ${line.startsWith('-') ? line.slice(1).trim() : line.trim()}\n`;
                });
            } else if (item.prev_progress) {
                const lines = item.prev_progress.split('\n').filter(l => l.trim().length > 0);
                lines.forEach(line => {
                    text += `  - (지난주) ${line.startsWith('-') ? line.slice(1).trim() : line.trim()}\n`;
                });
            }

            if (item.remarks) {
                text += `  (비고: ${item.remarks})\n`;
            }
            text += '\n';
        });

        return text.trim();
    };

    const handleCopy = () => {
        const reportText = generateReportText();
        navigator.clipboard.writeText(reportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col items-center py-10 px-4 sm:px-8">
            <div className="w-full max-w-5xl mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                    <ArrowLeft size={18} className="mr-2 shrink-0" />
                    돌아가기
                </Link>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 min-h-[600px]">
                {/* Header Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 flex-wrap md:flex-nowrap border-b border-neutral-100 pb-6">
                    {/* Weekly / Monthly Toggle */}
                    <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => setReportType('weekly')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                                reportType === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                        >
                            주간 보고
                        </button>
                        <button
                            onClick={() => setReportType('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                                reportType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                        >
                            월간 보고
                        </button>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center space-x-3 bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-200 shrink-0">
                        <button
                            onClick={handlePrev}
                            className="p-1.5 hover:bg-white rounded-lg text-neutral-600 transition-colors shrink-0"
                            title="이전 주"
                        >
                            <ChevronLeft size={20} className="shrink-0" />
                        </button>
                        <div className="text-center min-w-[180px] select-none">
                            <div className="text-base font-bold text-neutral-900 whitespace-nowrap">
                                {format(start, 'M월 d일')} - {format(end, 'M월 d일')}
                            </div>
                            <div className="text-xs text-neutral-400 font-medium whitespace-nowrap mt-0.5">
                                {format(start, 'yyyy-MM-dd')} ~ {format(end, 'yyyy-MM-dd')}
                            </div>
                        </div>
                        <button
                            onClick={handleNext}
                            className="p-1.5 hover:bg-white rounded-lg text-neutral-600 transition-colors shrink-0"
                            title="다음 주"
                        >
                            <ChevronRight size={20} className="shrink-0" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="ml-2 text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
                        >
                            오늘
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={handleDownloadDocx}
                            className="flex items-center space-x-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-all shadow-sm whitespace-nowrap shrink-0"
                        >
                            <Download size={18} className="shrink-0" />
                            <span className="text-sm font-semibold whitespace-nowrap">Word 다운로드</span>
                        </button>
                        <button
                            onClick={handleCopy}
                            className="flex items-center space-x-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0"
                        >
                            {copied ? <Check size={18} className="shrink-0 text-white" /> : <Copy size={18} className="shrink-0 text-white" />}
                            <span className="text-sm font-semibold whitespace-nowrap text-white">
                                {copied ? '복사됨' : '보고서 복사'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-neutral-50/70 rounded-xl border border-neutral-200 p-8">
                    <h1 className="text-2xl font-bold text-neutral-900 mb-8 text-center border-b border-neutral-200 pb-4">
                        {reportType === 'weekly' ? '주간 업무 보고' : '월간 업무 보고'}
                    </h1>

                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-blue-600 gap-2">
                            <Loader2 className="animate-spin h-5 w-5" />
                            <span className="text-sm font-medium">데이터 불러오는 중...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 text-neutral-400 text-sm">
                            해당 기간에 작성된 업무 보고가 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {items.map((item) => {
                                if (!item.project && !item.curr_progress && !item.prev_progress) return null;
                                return (
                                    <div key={item.id} className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                                        <h2 className="text-lg font-bold text-blue-600 mb-4 flex items-center">
                                            <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-3 shrink-0"></span>
                                            {item.project || '기타 프로젝트'}
                                            {item.division && (
                                                <span className="text-xs font-normal text-neutral-400 ml-2 bg-neutral-100 px-2 py-0.5 rounded-full">
                                                    {item.division}
                                                </span>
                                            )}
                                        </h2>
                                        <div className="space-y-3 pl-4">
                                            {item.curr_progress ? (
                                                <div className="space-y-1.5">
                                                    {item.curr_progress.split('\n').map((line, idx) => (
                                                        line.trim() && (
                                                            <div key={idx} className="flex items-start text-sm text-neutral-700 leading-relaxed">
                                                                <span className="inline-block text-blue-500 mr-2 font-bold">•</span>
                                                                <span className="flex-1">{line.trim()}</span>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            ) : item.prev_progress ? (
                                                <div className="space-y-1.5 opacity-75">
                                                    <span className="text-xs text-neutral-400 font-medium">(지난주 진행)</span>
                                                    {item.prev_progress.split('\n').map((line, idx) => (
                                                        line.trim() && (
                                                            <div key={idx} className="flex items-start text-sm text-neutral-600 leading-relaxed">
                                                                <span className="inline-block text-neutral-400 mr-2">•</span>
                                                                <span className="flex-1">{line.trim()}</span>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            ) : null}

                                            {item.remarks && (
                                                <div className="text-xs text-neutral-400 italic pt-2 border-t border-neutral-100">
                                                    비고: {item.remarks}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
