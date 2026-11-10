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

    // If Conceptual Mistake (CM), auto-schedule Notes Revision + QP Task
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
            {/* Glowing Icon Container */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
              <div className="relative bg-slate-900 text-amber-400 p-2.5 rounded-xl border border-amber-500/30 shadow-inner">
                <Zap className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>
            </div>

            {/* JEE RANK 1 Unique Glowing Header */}
            <div className="flex flex-col">
              <div className="relative inline-block">
                {/* Background Glow Layer */}
                <span className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 blur-lg opacity-70 animate-pulse rounded-lg"></span>
                
                {/* Foreground Styled Text */}
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
        {/* Navigation Sidebar */}
        <aside className="md:col-span-3 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={BarChart3} 
            label="Dashboard & Today's Plan" 
          />
          <NavItem 
            active={activeTab === 'alerts'} 
            onClick={() => setActiveTab('alerts')} 
            icon={Bell} 
            label="3-Day Spaced Repetition" 
            badge={dueReminders.length}
          />
          <NavItem 
            active={activeTab === 'mistakes'} 
            onClick={() => setActiveTab('mistakes')} 
            icon={ShieldAlert} 
            label="Mistake Log (Test/Module)" 
          />
          <NavItem 
            active={activeTab === 'schedule'} 
            onClick={() => setActiveTab('schedule')} 
            icon={Calendar} 
            label="Tasks & Schedule Table" 
          />
          <NavItem 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={Layers} 
            label="Permanent Vault & Stats" 
          />
        </aside>

        {/* Tab View Container */}
        <main className="md:col-span-9">
          {activeTab === 'dashboard' && (
            <DashboardView 
              tasks={tasks}
              setTasks={setTasks}
              mistakes={mistakes}
              dueReminders={dueReminders}
              onOpenMistakeModal={(m) => { setMistakeModalMode(m); setEditingMistake(null); setShowMistakeModal(true); }}
              onOpenTaskModal={(t) => { setEditingTask(t); setShowTaskModal(true); }}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'alerts' && (
            <SpacedRepetitionView 
              dueReminders={dueReminders} 
              onDecision={handleSpacedRepetitionDecision} 
            />
          )}

          {activeTab === 'mistakes' && (
            <MistakeAnalysisView 
              mistakes={mistakes} 
              onOpenMistakeModal={(m) => { setMistakeModalMode(m); setEditingMistake(null); setShowMistakeModal(true); }}
              onEditMistake={(m) => { setEditingMistake(m); setMistakeModalMode(m.sourceType); setShowMistakeModal(true); }}
              onDeleteMistake={handleDeleteMistake}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView 
              tasks={tasks} 
              setTasks={setTasks} 
              onOpenTaskModal={(t) => { setEditingTask(t); setShowTaskModal(true); }}
            />
          )}

          {activeTab === 'history' && (
            <HistoryVaultView 
              mistakes={mistakes} 
              onEditMistake={(m) => { setEditingMistake(m); setMistakeModalMode(m.sourceType); setShowMistakeModal(true); }}
              onDeleteMistake={handleDeleteMistake}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {showMistakeModal && (
        <AddMistakeModal 
          mode={mistakeModalMode}
          editingMistake={editingMistake}
          onClose={() => { setShowMistakeModal(false); setEditingMistake(null); }}
          onSubmit={handleAddOrEditMistake}
        />
      )}

      {showTaskModal && (
        <AddTaskModal 
          initialTask={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSubmit={handleSaveTask}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// NAV ITEM HELPER (SAFE ICON RENDERING)
// ----------------------------------------------------------------------
function NavItem({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
        active 
          ? 'bg-indigo-600 text-white shadow-xs' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      {badge > 0 && (
        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
          active ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------
// DASHBOARD VIEW
// ----------------------------------------------------------------------
function DashboardView({ tasks, setTasks, mistakes, dueReminders, onOpenMistakeModal, onOpenTaskModal, setActiveTab }) {
  const toggleComplete = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      {/* Late Night / Early Morning Planning Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Moon className="w-4 h-4" /> Daily Planning Hub (Night / Early Morning)
          </div>
          <h2 className="text-xl font-black mt-1">Organize Today & Tomorrow's High Priority Targets</h2>
          <p className="text-slate-300 text-xs mt-1">Review your scheduled slots, hard deadlines, and pending 3-day revision alerts.</p>
        </div>
        <button 
          onClick={() => onOpenTaskModal(null)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs whitespace-nowrap"
        >
          + Add New Schedule Target
        </button>
      </div>

      {/* 3-Day Spaced Repetition Alert Widget */}
      {dueReminders.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400/20 text-amber-900 p-2.5 rounded-xl">
              <Bell className="w-5 h-5 text-amber-700 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 text-sm">{dueReminders.length} Revisions Due Today (3-Day Cycle)</h3>
              <p className="text-amber-800 text-xs">Review these questions now to solidify formula retention.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('alerts')}
            className="bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold text-xs px-3.5 py-2 rounded-xl transition whitespace-nowrap"
          >
            Review Reminders
          </button>
        </div>
      )}

      {/* Quick Mistake Launcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Log Test Paper Mistake</h4>
            <p className="text-slate-500 text-xs">Log errors from Full or Chapter Mocks</p>
          </div>
          <button 
            onClick={() => onOpenMistakeModal('Test Paper')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
          >
            + Log Test
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Log Module / DPP Mistake</h4>
            <p className="text-slate-500 text-xs">Log mistakes from coaching modules</p>
          </div>
          <button 
            onClick={() => onOpenMistakeModal('Module/DPP')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
          >
            + Log Module
          </button>
        </div>
      </div>

      {/* Today's Priority Work List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Active Tasks & Deadlines</h3>
            <p className="text-xs text-slate-500">{pendingTasks.length} pending • {completedTasks.length} completed</p>
          </div>
          <button onClick={() => setActiveTab('schedule')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
            View Full Table <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No active tasks. Add one using the button above.</p>
          ) : (
            tasks.map(t => (
              <div 
                key={t.id} 
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  t.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleComplete(t.id)} 
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      t.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <div>
                    <h4 className={`text-xs font-bold ${t.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{t.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span>Slot: {t.timeSlot}</span>
                      <span>•</span>
                      <span className="text-rose-600 font-bold">Deadline: {t.deadline}</span>
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 text-[10px] font-black rounded ${
                  t.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                  t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {t.priority}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SPACED REPETITION VIEW (3-DAY CYCLE)
// ----------------------------------------------------------------------
function SpacedRepetitionView({ dueReminders, onDecision }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">3-Day Spaced Repetition Reminders</h2>
        <p className="text-slate-500 text-sm mt-0.5">Review mistakes due today. Choose whether to extend the revision cycle or mark as mastered.</p>
      </div>

      {dueReminders.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-extrabold text-emerald-900 text-base">All 3-Day Reminders Cleared!</h3>
          <p className="text-xs text-emerald-700 max-w-sm mx-auto">You have no active mistake revisions pending for today. Excellent work maintaining your revision momentum!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dueReminders.map(m => (
            <div key={m.id} className="bg-amber-50 border border-amber-300 p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-amber-200 text-amber-900 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  3-Day Cycle Reminder #{ (m.reminderCount || 0) + 1 }
                </span>
                <span className="text-xs text-amber-800 font-bold">Logged: {m.loggedDate}</span>
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-base">{m.exerciseNo} ({m.questionNo})</h4>
                <p className="text-xs font-bold text-slate-700">{m.sourceType}: {m.sourceName}</p>
                {m.formulaNote && (
                  <p className="text-xs text-slate-700 italic bg-amber-100/60 p-3 rounded-xl border border-amber-200 mt-2">
                    Key Note / Concept: {m.formulaNote}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs font-extrabold text-amber-950">Do you want to revise this again after another 3 days?</p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => onDecision(m.id, true)}
                    className="flex-1 sm:flex-none bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs"
                  >
                    Yes (In 3 Days)
                  </button>
                  <button 
                    onClick={() => onDecision(m.id, false)}
                    className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs"
                  >
                    No (Mastered)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MISTAKE ANALYSIS & LOG VIEW (MODULES & TESTS)
// ----------------------------------------------------------------------
function MistakeAnalysisView({ mistakes, onOpenMistakeModal, onEditMistake, onDeleteMistake }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mistake Tracker (Test Papers & Modules)</h2>
          <p className="text-slate-500 text-sm mt-0.5">Categorized logs for Conceptual (CM), Reading (RM), and Silly (SM) errors.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onOpenMistakeModal('Test Paper')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
          >
            + Test Mistake
          </button>
          <button 
            onClick={() => onOpenMistakeModal('Module/DPP')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
          >
            + Module Mistake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mistakes.length === 0 ? (
          <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No logged mistakes yet. Use the buttons above to log test paper or module/DPP questions.
          </div>
        ) : (
          mistakes.map(m => (
            <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-md ${
                  m.category === 'CM' ? 'bg-rose-100 text-rose-800' :
                  m.category === 'RM' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
                }`}>
                  {m.category} — {m.category === 'CM' ? 'Conceptual' : m.category === 'RM' ? 'Reading Error' : 'Silly Slip'}
                </span>
                <span className="text-xs text-slate-400 font-medium">{m.loggedDate}</span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">{m.exerciseNo} ({m.questionNo})</h4>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{m.sourceType}: {m.sourceName}</p>
                {m.formulaNote && (
                  <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    Note: {m.formulaNote}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-amber-700 font-bold text-[11px] flex items-center gap-1">
                  <Bell className="w-3 h-3 text-amber-500" /> Next Reminder: {m.nextReminderDate}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => onEditMistake(m)} className="p-1 text-slate-400 hover:text-indigo-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDeleteMistake(m.id)} className="p-1 text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCHEDULE TABLE VIEW
// ----------------------------------------------------------------------
function ScheduleView({ tasks, setTasks, onOpenTaskModal }) {
  const toggleComplete = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Study Tasks & Schedule Table</h2>
          <p className="text-slate-500 text-sm mt-0.5">Structured schedule overview with dates, time slots, priority levels, and automatic deadlines.</p>
        </div>
        <button 
          onClick={() => onOpenTaskModal(null)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Structured Task
        </button>
      </div>

      {/* Structured Interactive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Task Description</th>
                <th className="p-3.5">Date & Slot</th>
                <th className="p-3.5">Schedule Type</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Deadline</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No scheduled tasks available. Click "Add Structured Task" to begin.
                  </td>
                </tr>
              ) : (
                tasks.map(t => (
                  <tr key={t.id} className={`hover:bg-slate-50/80 transition ${t.completed ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <td className="p-3.5">
                      <button 
                        onClick={() => toggleComplete(t.id)} 
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          t.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-slate-400 bg-white'
                        }`}
                      >
                        {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      <span className={t.completed ? 'line-through text-slate-400' : ''}>{t.title}</span>
                      {t.source && <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">{t.source}</p>}
                    </td>

                    <td className="p-3.5 text-slate-600 font-semibold whitespace-nowrap">
                      <div>{t.date}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{t.timeSlot}</div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.isScheduled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.isScheduled ? 'Scheduled' : 'Unscheduled'}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        t.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                        t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-rose-600 whitespace-nowrap">
                      {t.deadline}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => onOpenTaskModal(t)} 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                          title="Edit Task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(t.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// HISTORY VAULT & STATS VIEW
// ----------------------------------------------------------------------
function HistoryVaultView({ mistakes, onEditMistake, onDeleteMistake }) {
  const stats = useMemo(() => {
    const total = mistakes.length;
    if (total === 0) return { cm: 0, rm: 0, sm: 0, cmPct: 0, rmPct: 0, smPct: 0 };
    const cm = mistakes.filter(m => m.category === 'CM').length;
    const rm = mistakes.filter(m => m.category === 'RM').length;
    const sm = mistakes.filter(m => m.category === 'SM').length;
    return {
      cm, rm, sm,
      cmPct: Math.round((cm / total) * 100),
      rmPct: Math.round((rm / total) * 100),
      smPct: Math.round((sm / total) * 100)
    };
  }, [mistakes]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Permanent History Vault & Stats</h2>
        <p className="text-slate-500 text-sm mt-0.5">All your logged mistakes stored permanently. Review stats or edit anytime.</p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Conceptual Mistakes (CM)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-rose-900">{stats.cm}</span>
            <span className="text-xs font-bold text-rose-700">{stats.cmPct}% of total</span>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
          <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">Reading Mistakes (RM)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-purple-900">{stats.rm}</span>
            <span className="text-xs font-bold text-purple-700">{stats.rmPct}% of total</span>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl">
          <p className="text-xs font-bold text-sky-800 uppercase tracking-wider">Silly Errors (SM)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-sky-900">{stats.sm}</span>
            <span className="text-xs font-bold text-sky-700">{stats.smPct}% of total</span>
          </div>
        </div>
      </div>

      {/* Complete Historical Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Permanent Log Records</h3>
          <span className="text-xs text-slate-400 font-medium">{mistakes.length} total entries</span>
        </div>

        <div className="divide-y divide-slate-100">
          {mistakes.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">No mistakes in history vault yet.</p>
          ) : (
            mistakes.map(m => (
              <div key={m.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded ${
                      m.category === 'CM' ? 'bg-rose-100 text-rose-800' :
                      m.category === 'RM' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {m.category}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{m.sourceType} • {m.sourceName}</span>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 mt-1">{m.exerciseNo} — {m.questionNo}</p>
                  {m.formulaNote && <p className="text-xs text-slate-500 italic mt-0.5">{m.formulaNote}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onEditMistake(m)} 
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                    title="Edit Record"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteMistake(m.id)} 
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADD / EDIT MISTAKE MODAL
// ----------------------------------------------------------------------
function AddMistakeModal({ mode, editingMistake, onClose, onSubmit }) {
  const [sourceName, setSourceName] = useState(editingMistake?.sourceName || '');
  const [exerciseNo, setExerciseNo] = useState(editingMistake?.exerciseNo || '');
  const [questionNo, setQuestionNo] = useState(editingMistake?.questionNo || '');
  const [category, setCategory] = useState(editingMistake?.category || 'CM');
  const [formulaNote, setFormulaNote] = useState(editingMistake?.formulaNote || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: editingMistake?.id,
      sourceType: mode || editingMistake?.sourceType || 'Test Paper',
      sourceName,
      exerciseNo,
      questionNo,
      category,
      formulaNote
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">
            {editingMistake ? 'Edit Mistake Entry' : `Log ${mode} Mistake`}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {mode === 'Module/DPP' ? 'Module / DPP Name' : 'Test Paper Name'}
            </label>
            <input 
              required
              type="text" 
              placeholder={mode === 'Module/DPP' ? 'e.g. Allen Physics Module' : 'e.g. JEE Main Full Mock #04'}
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Exercise / Section</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Exercise-2 or Section A"
                value={exerciseNo}
                onChange={e => setExerciseNo(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Question No.</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Q14"
                value={questionNo}
                onChange={e => setQuestionNo(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Mistake Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              className="w-full p-2.5 border rounded-xl font-bold text-slate-800"
            >
              <option value="CM">CM — Conceptual Mistake (Triggers Notes + Question Practice)</option>
              <option value="RM">RM — Reading Mistake (Mindfulness Logging Only)</option>
              <option value="SM">SM — Silly Mistake (Calculation/Careless Slip)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Quick Concept / Formula Note</label>
            <textarea 
              rows={2}
              placeholder="e.g. Moment of inertia parallel axis theorem or calculation error"
              value={formulaNote}
              onChange={e => setFormulaNote(e.target.value)}
              className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs">
              Save Mistake Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// HIGHLY SOPHISTICATED ADD / EDIT TASK MODAL
// ----------------------------------------------------------------------
function AddTaskModal({ initialTask, onClose, onSubmit }) {
  const todayDefault = new Date().toISOString().split('T')[0];
  
  const [title, setTitle] = useState(initialTask?.title || '');
  const [date, setDate] = useState(initialTask?.date || todayDefault);
  const [isScheduled, setIsScheduled] = useState(initialTask?.isScheduled ?? true);
  const [startTime, setStartTime] = useState(initialTask?.startTime || '16:00');
  const [endTime, setEndTime] = useState(initialTask?.endTime || '17:00');
  const [deadline, setDeadline] = useState(initialTask?.deadline || '');
  const [priority, setPriority] = useState(initialTask?.priority || 'High');

  const handleSubmit = (e) => {
    e.preventDefault();

    let computedSlot = 'Unscheduled';
    if (isScheduled && startTime && endTime) {
      computedSlot = `${startTime} - ${endTime}`;
    }

    // Automatic Deadline Calculation:
    // If no explicit deadline is supplied for a scheduled task, use the last minute of that scheduled slot (endTime)
    let finalDeadline = deadline;
    if (!finalDeadline) {
      if (isScheduled && endTime) {
        finalDeadline = endTime;
      } else {
        finalDeadline = '23:59';
      }
    }

    onSubmit({
      id: initialTask?.id || 't-' + Date.now(),
      title,
      date,
      isScheduled,
      startTime: isScheduled ? startTime : '',
      endTime: isScheduled ? endTime : '',
      timeSlot: computedSlot,
      deadline: finalDeadline,
      priority,
      completed: initialTask?.completed || false,
      source: initialTask?.source || 'User Scheduled'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{initialTask ? 'Edit Task Schedule' : 'Schedule Study Task'}</h3>
            <p className="text-[11px] text-slate-400">Configure precise dates, time slots, priority, and automatic deadlines.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Task Description / Work</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Physics PYQs - Rotational Motion"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Target Date</label>
              <input 
                required
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Priority</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value)} 
                className="w-full p-2.5 border rounded-xl font-bold text-slate-800"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Schedule Mode Selector */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Task Time Type</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer font-bold text-indigo-700">
                  <input 
                    type="radio" 
                    name="scheduleType" 
                    checked={isScheduled} 
                    onChange={() => setIsScheduled(true)} 
                  /> Scheduled
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-semibold text-slate-600">
                  <input 
                    type="radio" 
                    name="scheduleType" 
                    checked={!isScheduled} 
                    onChange={() => setIsScheduled(false)} 
                  /> Unscheduled
                </label>
              </div>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">Hard Deadline (Optional)</label>
              <span className="text-[10px] text-indigo-600 font-semibold">
                {isScheduled ? 'Auto-calculated to end time if blank' : 'Defaults to 23:59 if blank'}
              </span>
            </div>
            <input 
              type="text" 
              placeholder={isScheduled ? `e.g. ${endTime || '17:00'} (Leave blank for auto end time)` : 'e.g. 14:00 or Before 2pm'}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs">
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}