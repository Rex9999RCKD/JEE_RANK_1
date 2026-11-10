import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, CheckCircle2, AlertTriangle, BookOpen, Brain, 
  Plus, Search, Filter, Trash2, RefreshCw, ChevronRight, Award, 
  BarChart3, Tag, HelpCircle, Layers, Sparkles, FileText, ArrowRight,
  ShieldAlert, Check, X, Bell, Zap, Flame, RotateCcw, Edit, Moon, Sun
} from 'lucide-react';

// Safe LocalStorage Reader Helper
const loadStorageJSON = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'alerts', 'mistakes', 'schedule', 'history'
  
  // Tasks state with explicit dates, times, priority, type and deadlines
  const [tasks, setTasks] = useState(() => loadStorageJSON('jee_tasks', [
    {
      id: 't1',
      title: 'Solve 30 PYQs - Rotational Motion',
      subject: 'Physics',
      moduleOrChapter: 'Rotational Motion',
      date: new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '17:00',
      isScheduled: true,
      timeSlot: '16:00 - 17:00',
      deadline: '17:00',
      priority: 'High',
      completed: false,
      source: 'User Scheduled'
    },
    {
      id: 't2',
      title: 'Notes Revision: Electrostatics Formulae',
      subject: 'Physics',
      moduleOrChapter: 'Electrostatics',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      isScheduled: false,
      timeSlot: 'Unscheduled',
      deadline: '14:00',
      priority: 'High',
      completed: false,
      source: 'Auto-generated (CM)'
    }
  ]));

  const [tests, setTests] = useState(() => loadStorageJSON('jee_tests', [
    {
      id: 'test-1',
      name: 'JEE Main Full Mock #04',
      date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      totalScore: 194
    }
  ]));

  // Mistake log state: simplified to Module Name, Exercise, Question No, Mistake Category (CM/RM/SM)
  const [mistakes, setMistakes] = useState(() => loadStorageJSON('jee_mistakes', [
    {
      id: 'm-101',
      sourceType: 'Test Paper',
      sourceName: 'JEE Main Full Mock #04',
      exerciseNo: 'Physics Section A',
      questionNo: 'Q14',
      category: 'CM',
      formulaNote: 'Moment of Inertia parallel axis theorem',
      loggedDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      nextReminderDate: new Date().toISOString().split('T')[0],
      reminderCount: 0,
      status: 'Pending Revision'
    },
    {
      id: 'm-102',
      sourceType: 'Module/DPP',
      sourceName: 'Allen Physics Module',
      exerciseNo: 'Exercise-2',
      questionNo: 'Q08',
      category: 'SM',
      formulaNote: 'Calculation error in infinite ladder quadratic equation',
      loggedDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      nextReminderDate: new Date().toISOString().split('T')[0],
      reminderCount: 0,
      status: 'Pending Revision'
    }
  ]));

  // Modal States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showMistakeModal, setShowMistakeModal] = useState(false);
  const [mistakeModalMode, setMistakeModalMode] = useState('Test Paper');
  const [editingMistake, setEditingMistake] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('jee_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('jee_tests', JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem('jee_mistakes', JSON.stringify(mistakes));
  }, [mistakes]);

  // Today Date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Reminders Due Today or overdue
  const dueReminders = useMemo(() => {
    return (mistakes || []).filter(m => m.status === 'Pending Revision' && m.nextReminderDate <= todayStr);
  }, [mistakes, todayStr]);

  const handleSpacedRepetitionDecision = (mistakeId, extend3Days) => {
    setMistakes(prev => prev.map(m => {
      if (m.id === mistakeId) {
        if (extend3Days) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 3);
          return {
            ...m,
            reminderCount: (m.reminderCount || 0) + 1,
            nextReminderDate: nextDate.toISOString().split('T')[0],
            status: 'Pending Revision'
          };
        } else {
          return {
            ...m,
            status: 'Mastered'
          };
        }
      }
      return m;
    }));
  };

  const handleSaveTask = (taskData) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
      setEditingTask(null);
    } else {
      setTasks(prev => [taskData, ...prev]);
    }
    setShowTaskModal(false);
  };

  const handleAddOrEditMistake = (mistakeData) => {
    if (editingMistake) {
      setMistakes(prev => prev.map(m => m.id === editingMistake.id ? { ...m, ...mistakeData } : m));
      setEditingMistake(null);
      setShowMistakeModal(false);
      return;
    }

    const next3Days = new Date();
    next3Days.setDate(next3Days.getDate() + 3);

    const newMistake = {
      id: 'm-' + Date.now(),
      sourceType: mistakeData.sourceType || 'Test Paper',
      sourceName: mistakeData.sourceName,
      exerciseNo: mistakeData.exerciseNo,
      questionNo: mistakeData.questionNo,
      category: mistakeData.category || 'CM',
      formulaNote: mistakeData.formulaNote || '',
      loggedDate: todayStr,
      nextReminderDate: next3Days.toISOString().split('T')[0],
      reminderCount: 0,
      status: mistakeData.category === 'RM' ? 'Logged' : 'Pending Revision'
    };

    setMistakes(prev => [newMistake, ...prev]);

    if (newMistake.category === 'CM') {
      const remedialTask = {
        id: 't-' + Date.now(),
        title: `Notes Revision + QP: ${newMistake.sourceName} (${newMistake.exerciseNo} ${newMistake.questionNo})`,
        subject: 'General',
        moduleOrChapter: newMistake.sourceName,
        date: todayStr,
        startTime: '',
        endTime: '',
        isScheduled: false,
        timeSlot: 'Unscheduled',
        deadline: '23:59',
        priority: 'High',
        completed: false,
        source: 'Auto-generated (CM)'
      };
      setTasks(prev => [remedialTask, ...prev]);
    }

    setShowMistakeModal(false);
  };

  const handleDeleteMistake = (id) => {
    setMistakes(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-950 border-b border-indigo-900/50 sticky top-0 z-30 shadow-lg shadow-indigo-950/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
              <div className="relative bg-slate-900 text-amber-400 p-2.5 rounded-xl border border-amber-500/30 shadow-inner">
                <Zap className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            </div>
            </div>

            <div className="flex flex-col">
              <div className="relative inline-block">
                <span className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 blur-lg opacity-70 animate-pulse rounded-lg"></span>
                <h1 className="relative font-black text-2xl tracking-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-rose-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] uppercase font-mono">
                  JEE RANK 1
                </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dueReminders.length > 0 && (
            <button 
              onClick={() => setActiveTab('alerts')}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-500/40 flex items-center gap-2 transition shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            >
              <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{dueReminders.length} 3-Day Reminders</span>
            </button>
          )}
          <button 
            onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 border border-indigo-400/30"
          >
            <Plus className="w-4 h-4" /> Add Task & Schedule
          </button>
        </div>
      </div>
    </header>

    {/* Main Content Layout */}
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
      <aside className="md:col-span-3 space-y-2">
        <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={BarChart3} label="Dashboard & Today's Plan" />
        <NavItem active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={Bell} label="3-Day Spaced Repetition" badge={dueReminders.length} />
        <NavItem active={activeTab === 'mistakes'} onClick={() => setActiveTab('mistakes')} icon={ShieldAlert} label="Mistake Log (Test/Module)" />
        <NavItem active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={Calendar} label="Tasks & Schedule Table" />
        <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Layers} label="Permanent Vault & Stats" />
      </aside>

      <main className="md:col-span-9">
        {activeTab === 'dashboard' && (
          <DashboardView tasks={tasks} setTasks={setTasks} mistakes={mistakes} dueReminders={dueReminders} onOpenMistakeModal={(m) => { setMistakeModalMode(m); setEditingMistake(null); setShowMistakeModal(true); }} onOpenTaskModal={(t) => { setEditingTask(t); setShowTaskModal(true); }} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'alerts' && <SpacedRepetitionView dueReminders={dueReminders} onDecision={handleSpacedRepetitionDecision} />}
        {activeTab === 'mistakes' && <MistakeAnalysisView mistakes={mistakes} onOpenMistakeModal={(m) => { setMistakeModalMode(m); setEditingMistake(null); setShowMistakeModal(true); }} onEditMistake={(m) => { setEditingMistake(m); setMistakeModalMode(m.sourceType); setShowMistakeModal(true); }} onDeleteMistake={handleDeleteMistake} />}
        {activeTab === 'schedule' && <ScheduleView tasks={tasks} setTasks={setTasks} onOpenTaskModal={(t) => { setEditingTask(t); setShowTaskModal(true); }} />}
        {activeTab === 'history' && <HistoryVaultView mistakes={mistakes} onEditMistake={(m) => { setEditingMistake(m); setMistakeModalMode(m.sourceType); setShowMistakeModal(true); }} onDeleteMistake={handleDeleteMistake} />}
      </main>
    </div>

    {showMistakeModal && <AddMistakeModal mode={mistakeModalMode} editingMistake={editingMistake} onClose={() => { setShowMistakeModal(false); setEditingMistake(null); }} onSubmit={handleAddOrEditMistake} />}
    {showTaskModal && <AddTaskModal initialTask={editingTask} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} onSubmit={handleSaveTask} />}
  </div>
  );
}

function NavItem({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${active ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      {badge > 0 && <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${active ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'}`}>{badge}</span>}
    </button>
  );
}

function DashboardView({ tasks, setTasks, mistakes, dueReminders, onOpenMistakeModal, onOpenTaskModal, setActiveTab }) {
  const toggleComplete = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider"><Moon className="w-4 h-4" /> Daily Planning Hub</div>
          <h2 className="text-xl font-black mt-1">Organize Today & Tomorrow's High Priority Targets</h2>
          <p className="text-slate-300 text-xs mt-1">Review your scheduled slots, hard deadlines, and pending 3-day revision alerts.</p>
        </div>
        <button onClick={() => onOpenTaskModal(null)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition whitespace-nowrap">+ Add New Schedule Target</button>
      </div>

      {dueReminders.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400/20 text-amber-900 p-2.5 rounded-xl"><Bell className="w-5 h-5 text-amber-700 animate-bounce" /></div>
            <div>
              <h3 className="font-extrabold text-amber-900 text-sm">{dueReminders.length} Revisions Due Today (3-Day Cycle)</h3>
              <p className="text-amber-800 text-xs">Review these questions now to solidify formula retention.</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('alerts')} className="bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold text-xs px-3.5 py-2 rounded-xl transition whitespace-nowrap">Review Reminders</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div><h4 className="font-extrabold text-slate-900 text-sm">Log Test Paper Mistake</h4><p className="text-slate-500 text-xs">Log errors from Full or Chapter Mocks</p></div>
          <button onClick={() => onOpenMistakeModal('Test Paper')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition">+ Log Test</button>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div><h4 className="font-extrabold text-slate-900 text-sm">Log Module / DPP Mistake</h4><p className="text-slate-500 text-xs">Log mistakes from coaching modules</p></div>
          <button onClick={() => onOpenMistakeModal('Module/DPP')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition">+ Log Module</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div><h3 className="font-extrabold text-slate-900 text-base">Active Tasks & Deadlines</h3><p className="text-xs text-slate-500">{pendingTasks.length} pending • {completedTasks.length} completed</p></div>
          <button onClick={() => setActiveTab('schedule')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">View Full Table <ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {tasks.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">No active tasks.</p> : tasks.map(t => (
            <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between transition ${t.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleComplete(t.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${t.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>{t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}</button>
                <div>
                  <h4 className={`text-xs font-bold ${t.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{t.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium"><span>{t.date}</span><span>•</span><span>Slot: {t.timeSlot}</span><span>•</span><span className="text-rose-600 font-bold">Deadline: {t.deadline}</span></div>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded ${t.priority === 'High' ? 'bg-rose-100 text-rose-800' : t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{t.priority}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpacedRepetitionView({ dueReminders, onDecision }) {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-slate-900">3-Day Spaced Repetition Reminders</h2><p className="text-slate-500 text-sm mt-0.5">Review mistakes due today.</p></div>
      {dueReminders.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-extrabold text-emerald-900 text-base">All 3-Day Reminders Cleared!</h3>
          <p className="text-xs text-emerald-700">You have no active mistake revisions pending for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dueReminders.map(m => (
            <div key={m.id} className="bg-amber-50 border border-amber-300 p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between"><span className="bg-amber-200 text-amber-900 font-black text-[10px] px-2.5 py-1 rounded-md">Reminder #{ (m.reminderCount || 0) + 1 }</span><span className="text-xs text-amber-800 font-bold">Logged: {m.loggedDate}</span></div>
              <div><h4 className="font-black text-slate-900 text-base">{m.exerciseNo} ({m.questionNo})</h4><p className="text-xs font-bold text-slate-700">{m.sourceType}: {m.sourceName}</p>{m.formulaNote && <p className="text-xs text-slate-700 italic bg-amber-100/60 p-3 rounded-xl border border-amber-200 mt-2">Note: {m.formulaNote}</p>}</div>
              <div className="pt-3 border-t border-amber-200 flex items-center justify-between gap-3">
                <p className="text-xs font-extrabold text-amber-950">Revise again in 3 days?</p>
                <div className="flex items-center gap-2"><button onClick={() => onDecision(m.id, true)} className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition">Yes (In 3 Days)</button><button onClick={() => onDecision(m.id, false)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition">No (Mastered)</button></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MistakeAnalysisView({ mistakes, onOpenMistakeModal, onEditMistake, onDeleteMistake }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Mistake Tracker</h2><p className="text-slate-500 text-sm mt-0.5">Categorized logs for CM, RM, and SM errors.</p></div>
        <div className="flex items-center gap-2"><button onClick={() => onOpenMistakeModal('Test Paper')} className="bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-xl">+ Test Mistake</button><button onClick={() => onOpenMistakeModal('Module/DPP')} className="bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-xl">+ Module Mistake</button></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mistakes.length === 0 ? <div className="col-span-2 bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">No logged mistakes yet.</div> : mistakes.map(m => (
          <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between"><span className={`px-2.5 py-1 text-[10px] font-black rounded-md ${m.category === 'CM' ? 'bg-rose-100 text-rose-800' : m.category === 'RM' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'}`}>{m.category}</span><span className="text-xs text-slate-400">{m.loggedDate}</span></div>
            <div><h4 className="font-bold text-slate-900 text-sm">{m.exerciseNo} ({m.questionNo})</h4><p className="text-xs font-semibold text-slate-600">{m.sourceType}: {m.sourceName}</p>{m.formulaNote && <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2.5 rounded-lg border">Note: {m.formulaNote}</p>}</div>
            <div className="flex items-center justify-between pt-2 border-t text-xs"><span className="text-amber-700 font-bold">Next Reminder: {m.nextReminderDate}</span><div className="flex gap-2"><button onClick={() => onEditMistake(m)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button><button onClick={() => onDeleteMistake(m.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleView({ tasks, setTasks, onOpenTaskModal }) {
  const toggleComplete = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Study Tasks & Schedule Table</h2><p className="text-slate-500 text-sm mt-0.5">Structured schedule overview.</p></div>
        <button onClick={() => onOpenTaskModal(null)} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1"><Plus className="w-4 h-4" /> Add Structured Task</button>
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px]">
              <tr><th className="p-3.5">Status</th><th className="p-3.5">Task Description</th><th className="p-3.5">Date & Slot</th><th className="p-3.5">Type</th><th className="p-3.5">Priority</th><th className="p-3.5">Deadline</th><th className="p-3.5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">No scheduled tasks available.</td></tr> : tasks.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50 transition ${t.completed ? 'opacity-60 bg-slate-50' : ''}`}>
                  <td className="p-3.5"><button onClick={() => toggleComplete(t.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center ${t.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white'}`}>{t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}</button></td>
                  <td className="p-3.5 font-bold text-slate-900"><span className={t.completed ? 'line-through text-slate-400' : ''}>{t.title}</span>{t.source && <p className="text-[10px] text-indigo-600">{t.source}</p>}</td>
                  <td className="p-3.5 text-slate-600"><div>{t.date}</div><div className="text-[10px] text-slate-400 font-bold">{t.timeSlot}</div></td>
                  <td className="p-3.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.isScheduled ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{t.isScheduled ? 'Scheduled Slot' : 'Unscheduled'}</span></td>
                  <td className="p-3.5"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${t.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{t.priority}</span></td>
                  <td className="p-3.5 font-bold text-rose-600">{t.deadline}</td>
                  <td className="p-3.5 text-right"><button onClick={() => setTasks(prev => prev.filter(item => item.id !== t.id))} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HistoryVaultView({ mistakes, onEditMistake, onDeleteMistake }) {
  const masteredMistakes = mistakes.filter(m => m.status === 'Mastered');
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-slate-900">Permanent Vault & Stats</h2><p className="text-slate-500 text-sm mt-0.5">Mastered questions and historical review archive.</p></div>
      <div className="bg-white p-6 rounded-2xl border shadow-2xs space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base">Mastered Concepts Vault ({masteredMistakes.length})</h3>
        {masteredMistakes.length === 0 ? <p className="text-xs text-slate-400">No mastered questions yet. Complete your 3-day revision cycles to move items here.</p> : masteredMistakes.map(m => (
          <div key={m.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div><span className="font-bold text-emerald-900">{m.sourceName} — {m.exerciseNo} ({m.questionNo})</span><p className="text-emerald-700 text-[10px] mt-0.5">{m.formulaNote}</p></div>
            <button onClick={() => onDeleteMistake(m.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddMistakeModal({ mode, editingMistake, onClose, onSubmit }) {
  const [sourceName, setSourceName] = useState(editingMistake ? editingMistake.sourceName : '');
  const [exerciseNo, setExerciseNo] = useState(editingMistake ? editingMistake.exerciseNo : '');
  const [questionNo, setQuestionNo] = useState(editingMistake ? editingMistake.questionNo : '');
  const [category, setCategory] = useState(editingMistake ? editingMistake.category : 'CM');
  const [formulaNote, setFormulaNote] = useState(editingMistake ? editingMistake.formulaNote : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceName || !questionNo) return;
    onSubmit({ sourceType: mode, sourceName, exerciseNo, questionNo, category, formulaNote });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3"><h3 className="font-bold text-slate-900 text-base">{editingMistake ? 'Edit Mistake' : `Log ${mode} Mistake`}</h3><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div><label className="font-bold text-slate-700">Source Name (e.g. Allen Module / Mock #4)</label><input type="text" value={sourceName} onChange={e => setSourceName(e.target.value)} required className="w-full mt-1 p-2.5 border rounded-xl" placeholder="Enter test or module name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="font-bold text-slate-700">Exercise / Section</label><input type="text" value={exerciseNo} onChange={e => setExerciseNo(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" placeholder="e.g. Exercise-2" /></div>
            <div><label className="font-bold text-slate-700">Question No.</label><input type="text" value={questionNo} onChange={e => setQuestionNo(e.target.value)} required className="w-full mt-1 p-2.5 border rounded-xl" placeholder="e.g. Q14" /></div>
          </div>
          <div><label className="font-bold text-slate-700">Mistake Category</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl"><option value="CM">CM — Conceptual Mistake</option><option value="RM">RM — Reading Error</option><option value="SM">SM — Silly Slip</option></select></div>
          <div><label className="font-bold text-slate-700">Formula / Concept Note</label><textarea value={formulaNote} onChange={e => setFormulaNote(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" placeholder="Brief note on what went wrong..." rows={3}></textarea></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl font-bold">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl">Save Mistake</button></div>
        </form>
      </div>
    </div>
  );
}

function AddTaskModal({ initialTask, onClose, onSubmit }) {
  const [title, setTitle] = useState(initialTask ? initialTask.title : '');
  const [date, setDate] = useState(initialTask ? initialTask.date : new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialTask ? initialTask.startTime : '');
  const [endTime, setEndTime] = useState(initialTask ? initialTask.endTime : '');
  const [priority, setPriority] = useState(initialTask ? initialTask.priority : 'High');
  const [deadline, setDeadline] = useState(initialTask ? initialTask.deadline : '23:59');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    const isScheduled = Boolean(startTime && endTime);
    onSubmit({
      id: initialTask ? initialTask.id : 't-' + Date.now(),
      title,
      subject: 'General',
      date,
      startTime,
      endTime,
      isScheduled,
      timeSlot: isScheduled ? `${startTime} - ${endTime}` : 'Unscheduled',
      deadline,
      priority,
      completed: initialTask ? initialTask.completed : false,
      source: 'User Scheduled'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3"><h3 className="font-bold text-slate-900 text-base">{initialTask ? 'Edit Task' : 'Add Study Target'}</h3><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div><label className="font-bold text-slate-700">Task Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full mt-1 p-2.5 border rounded-xl" placeholder="e.g. Solve 30 PYQs" /></div>
          <div><label className="font-bold text-slate-700">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full mt-1 p-2.5 border rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="font-bold text-slate-700">Start Time (Optional)</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" /></div>
            <div><label className="font-bold text-slate-700">End Time (Optional)</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="font-bold text-slate-700">Priority</label><select value={priority} onChange={e => setPriority(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
            <div><label className="font-bold text-slate-700">Hard Deadline</label><input type="time" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl font-bold">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl">Save Target</button></div>
        </form>
      </div>
    </div>
  );
}
