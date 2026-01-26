'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2, Loader2, Building2, User, Calendar, Edit2, X, CloudDownload } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    client: string;
    pm: string;
    period: string;
    code?: string;
}

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // New Project State
    const [newName, setNewName] = useState('');
    const [newClient, setNewClient] = useState('');
    const [newPm, setNewPm] = useState('');
    const [newPeriod, setNewPeriod] = useState('');
    const [newCode, setNewCode] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProjects(data);
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setAdding(true);
        try {
            const url = editingId ? '/api/projects' : '/api/projects';
            const method = editingId ? 'PUT' : 'POST';
            const body: any = {
                name: newName,
                client: newClient,
                pm: newPm,
                period: newPeriod,
                code: newCode
            };

            if (editingId) body.id = editingId;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setNewName('');
                setNewClient('');
                setNewPm('');
                setNewPeriod('');
                setNewCode('');
                setEditingId(null);
                fetchProjects();
            }
        } catch (error) {
            console.error('Failed to add project', error);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const res = await fetch(`/api/projects?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setProjects(prev => prev.filter(p => p.id !== id));
                if (id === editingId) {
                    handleCancelEdit();
                }
            }
        } catch (error) {
            console.error('Failed to delete project', error);
        }
    };

    const handleEdit = (project: Project) => {
        setEditingId(project.id);
        setNewName(project.name);
        setNewClient(project.client);
        setNewPm(project.pm);
        setNewPeriod(project.period);
        setNewCode(project.code || '');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewName('');
        setNewClient('');
        setNewPm('');
        setNewPeriod('');
        setNewCode('');
    };

    const handleImportProjects = async () => {
        if (!confirm('외부 DB(gannt-j)에서 프로젝트를 가져오시겠습니까? 중복된 프로젝트는 건너뜁니다.')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/projects/import', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`${data.count}개의 프로젝트를 성공적으로 가져왔습니다.`);
                fetchProjects();
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

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col items-center py-10 px-4 sm:px-8">
            <div className="w-full max-w-4xl mb-8 flex items-center gap-4">
                <button
                    onClick={() => router.push('/')}
                    className="p-2 hover:bg-white rounded-xl text-neutral-500 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">프로젝트 관리</h1>
                    <p className="text-neutral-500 text-sm">주간보고서에 사용할 프로젝트 목록을 관리합니다.</p>
                </div>
                <div className="ml-auto">
                    <button
                        onClick={handleImportProjects}
                        className="flex items-center space-x-2 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-all"
                        title="외부 DB에서 프로젝트 가져오기"
                    >
                        <CloudDownload size={16} />
                        <span>가져오기</span>
                    </button>
                </div>
            </div>

            {/* Add Form */}
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {editingId ? (
                        <>
                            <Edit2 size={20} className="text-orange-500" />
                            프로젝트 수정
                        </>
                    ) : (
                        <>
                            <Plus size={20} className="text-blue-500" />
                            새 프로젝트 등록
                        </>
                    )}
                </h2>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <input
                        placeholder="프로젝트명 (필수)"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="lg:col-span-2 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                        required
                    />
                    <input
                        placeholder="발주처/부서"
                        value={newClient}
                        onChange={e => setNewClient(e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <input
                        placeholder="프로젝트 코드"
                        value={newCode}
                        onChange={e => setNewCode(e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <input
                        placeholder="PM"
                        value={newPm}
                        onChange={e => setNewPm(e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <input
                        placeholder="수행기간"
                        value={newPeriod}
                        onChange={e => setNewPeriod(e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <div className="flex gap-2 lg:col-span-1">
                        <button
                            type="submit"
                            disabled={adding || !newName}
                            className={`flex-1 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-neutral-900 hover:bg-neutral-800'}`}
                        >
                            {adding ? <Loader2 className="animate-spin" /> : (editingId ? '수정' : '등록')}
                        </button>
                        {editingId && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(editingId)}
                                    className="px-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                    title="삭제"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-3 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300 transition-colors"
                                    title="취소"
                                >
                                    <X size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>

            {/* Project List */}
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center text-neutral-400">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400">
                        등록된 프로젝트가 없습니다.
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {projects.map(project => (
                            <div key={project.id} className={`p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors ${editingId === project.id ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}>
                                <div className="flex-1 cursor-pointer" onClick={() => handleEdit(project)}>
                                    <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                                        {project.name}
                                        {project.code && <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200 font-mono">{project.code}</span>}
                                    </h3>
                                    <div className="flex gap-4 mt-1 text-xs text-neutral-500">
                                        {project.client && (
                                            <span className="flex items-center gap-1.5">
                                                <Building2 size={12} /> {project.client}
                                            </span>
                                        )}
                                        {project.pm && (
                                            <span className="flex items-center gap-1.5">
                                                <User size={12} /> {project.pm}
                                            </span>
                                        )}
                                        {project.period && (
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={12} /> {project.period}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(project.id)}
                                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
