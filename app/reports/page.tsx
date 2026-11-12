'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowLeft, Download, Copy, Check, Loader2, Mail } from 'lucide-react';
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

    // 한국 표준 주차 계산 (목요일 기준)
    const thursday = addDays(start, 3);
    const reportYear = thursday.getFullYear();
    const displayMonth = thursday.getMonth() + 1;
    const displayWeek = Math.ceil(thursday.getDate() / 7);
    const shortYear = String(reportYear).slice(-2);

    // 메일 발송 도우미 상태
    const [recipientEmail, setRecipientEmail] = useState('sharpnoh@geostory.co.kr');
    const [senderName] = useState('이재현');
    const [earlyReason, setEarlyReason] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const divisionName = items.length > 0 && items[0].division ? items[0].division : '기획실';
    const emailSubject = `[주간보고] ${displayMonth}월 ${displayWeek}주차 주간보고 드립니다`;
    const docFileName = `${reportYear}_${displayMonth}월${displayWeek}주차_${divisionName}_주간보고자료_v1.0.docx`;
    const emailBody = `안녕하십니까!! ${senderName}입니다\n\n${
        earlyReason.trim()
            ? `${earlyReason.trim()} '${shortYear}년 ${displayMonth}월 ${displayWeek}주차 주간보고 미리 송부드립니다`
            : `'${shortYear}년 ${displayMonth}월 ${displayWeek}주차 주간보고 송부드립니다`
    }\n\n감사합니다\n${senderName} 드림`;

    const handleCopyEmailField = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

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
                            주단위
                        </button>
                        <button
                            onClick={() => setReportType('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                                reportType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                        >
                            월단위
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
                                {format(start, 'yyyy-MM-dd')} ~ {format(end, 'yyyy-MM-dd')} ({displayMonth}월 {displayWeek}주차)
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
                                {copied ? '복사됨' : '본문 복사'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 주간보고 메일 발송 도우미 (주단위일 때 표시) */}
                {reportType === 'weekly' && (
                    <div className="mb-8 bg-blue-50/50 rounded-2xl p-5 border border-blue-100 space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                <Mail size={16} className="text-blue-600" />
                                <span>주간보고 메일 발송 도우미 ({displayMonth}월 {displayWeek}주차)</span>
                            </h3>
                            <span className="text-xs text-blue-600/80 font-medium">
                                첨부파일명: <code className="bg-white/80 px-2 py-0.5 rounded border border-blue-100 font-mono">{docFileName}</code>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* 받는사람 메일 주소 */}
                            <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-semibold text-neutral-400 mb-0.5">받는사람 메일 주소</span>
                                    <input
                                        type="text"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className="w-full text-sm font-semibold text-neutral-800 bg-transparent border-0 p-0 focus:ring-0 outline-none truncate font-mono"
                                    />
                                </div>
                                <button
                                    onClick={() => handleCopyEmailField(recipientEmail, 'recipient')}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                    {copiedField === 'recipient' ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedField === 'recipient' ? '복사됨' : '주소 복사'}</span>
                                </button>
                            </div>

                            {/* 메일 제목 */}
                            <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-semibold text-neutral-400 mb-0.5">메일 제목</span>
                                    <div className="text-sm font-bold text-neutral-900 truncate select-all">
                                        {emailSubject}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCopyEmailField(emailSubject, 'subject')}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                    {copiedField === 'subject' ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedField === 'subject' ? '복사됨' : '제목 복사'}</span>
                                </button>
                            </div>
                        </div>

                        {/* 메일 본문 멘트 & 사유 입력 */}
                        <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="text-xs font-bold text-neutral-600 shrink-0">사전 발송 사유 (선택):</label>
                                    <input
                                        type="text"
                                        value={earlyReason}
                                        onChange={(e) => setEarlyReason(e.target.value)}
                                        placeholder="예: 내일 병원 진료로 / 내일 연차 사용으로 (비워두면 기본 멘트)"
                                        className="flex-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => handleCopyEmailField(emailBody, 'body')}
                                    className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                >
                                    {copiedField === 'body' ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedField === 'body' ? '본문 복사됨' : '메일 본문 복사'}</span>
                                </button>
                            </div>
                            <pre className="text-xs text-neutral-700 font-sans whitespace-pre-wrap leading-relaxed select-all bg-neutral-50/70 p-3 rounded-lg border border-neutral-100">
                                {emailBody}
                            </pre>
                        </div>
                    </div>
                )}

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
