import React, { useState, useEffect, useMemo, useRef } from 'react';
import BackupRestoreView from './BackupRestoreView';
import { 
  Calendar, Clock, CheckCircle2, AlertTriangle, BookOpen, Brain, 
  Plus, Search, Filter, Trash2, RefreshCw, ChevronRight, Award, 
  BarChart3, Tag, HelpCircle, Layers, Sparkles, FileText, ArrowRight,
  ShieldAlert, Check, X, Bell, Zap, Flame, RotateCcw, Edit, Moon, Sun
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { supabase } from './supabase';

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

// Add calendar days without UTC timezone shifting.
const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Display stored 24-hour times in 12-hour AM/PM format.
const formatTime = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return time || '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'P.M.' : 'A.M.';
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatTimeSlot = (slot) => {
  if (!slot || slot === 'Unscheduled') return slot || '';
  const parts = slot.split(' - ');
  return parts.length === 2
    ? `${formatTime(parts[0])} - ${formatTime(parts[1])}`
    : slot;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'alerts', 'longterm', 'mistakes', 'schedule', 'history', 'backup'
  
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
  ]).map(m => {
    // Migrate topics mastered under the old 3-day-only system into the new day-7 stage.
    if (m.status === 'Mastered' && m.longTermStage == null) {
      return {
        ...m,
        status: 'Long-term Revision',
        longTermStage: 0,
        nextReminderDate: addDays(m.loggedDate || new Date().toISOString().split('T')[0], 16)
      };
    }
    return m;
  }));

  // Modal States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showMistakeModal, setShowMistakeModal] = useState(false);
  const [mistakeModalMode, setMistakeModalMode] = useState('Test Paper');
  const [editingMistake, setEditingMistake] = useState(null);

  // Sync to localStorage
  
  // Cloud synchronization with Supabase
  const [cloudReady, setCloudReady] = useState(false);

  const remoteSyncRef = useRef({
  tasks: null,
  tests: null,
  mistakes: null
});
  const initialDataRef = useRef({ tasks, tests, mistakes });

  // Load cloud data and migrate existing local data on first login.
  useEffect(() => {
    let cancelled = false;

    const initializeCloud = async () => {
      try {
        const { data: { user }, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error('No authenticated user found.');

        const collections = [
          { table: 'jee_tasks', key: 'jee_tasks', fallback: initialDataRef.current.tasks },
          { table: 'jee_tests', key: 'jee_tests', fallback: initialDataRef.current.tests },
          { table: 'jee_mistakes', key: 'jee_mistakes', fallback: initialDataRef.current.mistakes }
        ];

        const loaded = {};

        for (const item of collections) {
          const { data: cloudRecord, error } = await supabase
            .from(item.table)
            .select('data')
            .eq('user_id', user.id)
            .eq('record_id', '__all__')
            .maybeSingle();

          if (error) throw error;

          if (cloudRecord && Array.isArray(cloudRecord.data)) {
            loaded[item.key] = cloudRecord.data;
          } else {
            // No cloud record: preserve and migrate existing browser data.
            let localData = item.fallback;

            try {
              const stored = localStorage.getItem(item.key);
              if (stored !== null) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) localData = parsed;
              }
            } catch (parseError) {
              console.error('Local data migration error:', parseError);
            }

            loaded[item.key] = localData;

            const { error: migrationError } = await supabase
              .from(item.table)
              .upsert({
                user_id: user.id,
                record_id: '__all__',
                data: localData
              }, { onConflict: 'user_id,record_id' });

            if (migrationError) throw migrationError;
          }
        }

        if (cancelled) return;

        setTasks(loaded.jee_tasks);
        setTests(loaded.jee_tests);
        setMistakes(loaded.jee_mistakes);

        setCloudReady(true);
        console.log('JEE RANK 1 cloud data loaded successfully.');
      } catch (error) {
        console.error('Cloud initialization failed:', error);
      }
    };

    initializeCloud();

    return () => {
      cancelled = true;
    };
  }, []);

// Listen for changes made on other devices.
useEffect(() => {
  if (!cloudReady) return;

  let channel;

  const setupRealtime = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return;

    channel = supabase
      .channel(`jee-live-sync-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jee_tasks',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const data = payload.new.data;
        if (Array.isArray(data)) {
          remoteSyncRef.current.tasks = data;
          setTasks(data);
          localStorage.setItem('jee_tasks', JSON.stringify(data));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jee_tests',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const data = payload.new.data;
        if (Array.isArray(data)) {
          remoteSyncRef.current.tests = data;
          setTests(data);
          localStorage.setItem('jee_tests', JSON.stringify(data));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jee_mistakes',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const data = payload.new.data;
        if (Array.isArray(data)) {
          remoteSyncRef.current.mistakes = data;
          setMistakes(data);
          localStorage.setItem('jee_mistakes', JSON.stringify(data));
        }
      })
      .subscribe();
  };

  setupRealtime();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, [cloudReady]);
  // Save changes to browser storage and Supabase.
  useEffect(() => {
    if (!cloudReady) return;


    const isRemoteUpdate =
  remoteSyncRef.current.tasks !== null &&
  JSON.stringify(tasks) === JSON.stringify(remoteSyncRef.current.tasks);

remoteSyncRef.current.tasks = null;

if (isRemoteUpdate) return;

    localStorage.setItem('jee_tasks', JSON.stringify(tasks));

    const saveTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('jee_tasks').upsert({
        user_id: user.id,
        record_id: '__all__',
        data: tasks
      }, { onConflict: 'user_id,record_id' });

      if (error) console.error('Task cloud save failed:', error);
    };

    saveTasks();
  }, [tasks, cloudReady]);

  useEffect(() => {
    if (!cloudReady) return;


    const isRemoteUpdate =
  remoteSyncRef.current.tests !== null &&
  JSON.stringify(tests) === JSON.stringify(remoteSyncRef.current.tests);

remoteSyncRef.current.tests = null;

if (isRemoteUpdate) return;

    localStorage.setItem('jee_tests', JSON.stringify(tests));

    const saveTests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('jee_tests').upsert({
        user_id: user.id,
        record_id: '__all__',
        data: tests
      }, { onConflict: 'user_id,record_id' });

      if (error) console.error('Test cloud save failed:', error);
    };

    saveTests();
  }, [tests, cloudReady]);

  useEffect(() => {
    if (!cloudReady) return;
const isRemoteUpdate =
  remoteSyncRef.current.mistakes !== null &&
  JSON.stringify(mistakes) === JSON.stringify(remoteSyncRef.current.mistakes);

remoteSyncRef.current.mistakes = null;

if (isRemoteUpdate) return;
    localStorage.setItem('jee_mistakes', JSON.stringify(mistakes));

    const saveMistakes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('jee_mistakes').upsert({
        user_id: user.id,
        record_id: '__all__',
        data: mistakes
      }, { onConflict: 'user_id,record_id' });

      if (error) console.error('Mistake cloud save failed:', error);
    };

    saveMistakes();
  }, [mistakes, cloudReady]);


  // Today Date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Reminders due today or overdue in the original 3-day loop.
  const dueReminders = useMemo(() => {
    return (mistakes || []).filter(m => m.status === 'Pending Revision' && m.nextReminderDate <= todayStr);
  }, [mistakes, todayStr]);

  // Topics that passed the 3-day loop and are progressing through cumulative days 16, 31 and 61.
  const longTermReminders = useMemo(() => {
    return (mistakes || []).filter(m => m.status === 'Long-term Revision');
  }, [mistakes]);
  const dueLongTermReminders = useMemo(() => {
    return longTermReminders.filter(m => m.nextReminderDate <= todayStr);
  }, [longTermReminders, todayStr]);

  const handleSpacedRepetitionDecision = (mistakeId, extend3Days) => {
    setMistakes(prev => prev.map(m => {
      if (m.id !== mistakeId) return m;
      const originalLoggedDate = m.loggedDate || todayStr;

      if (extend3Days) {
        // Keep 3-day reminders anchored to the original logged date:
        // day 3, then day 6, then day 9, and so on.
        const nextReminderCount = (m.reminderCount || 0) + 1;
        const nextOffset = 3 * (nextReminderCount + 1);
        return {
          ...m,
          reminderCount: nextReminderCount,
          nextReminderDate: addDays(originalLoggedDate, nextOffset),
          status: 'Pending Revision'
        };
      }

      // Mastered in the 3-day loop: begin the cumulative long-term cycle at day 16.
      return {
        ...m,
        status: 'Long-term Revision',
        longTermStage: 0,
        nextReminderDate: addDays(originalLoggedDate, 16),
        longTermHistory: []
      };
    }));
  };

  const handleLongTermDecision = (mistakeId) => {
    setMistakes(prev => prev.map(m => {
      if (m.id !== mistakeId || m.status !== 'Long-term Revision') return m;
      const nextStage = (m.longTermStage || 0) + 1;
      // Cumulative offsets from the original logged date: day 16, 31 and 61.
      const cumulativeReviewDays = [16, 31, 61];
      if (nextStage >= cumulativeReviewDays.length) {
        return { ...m, status: 'Mastered', longTermStage: 3, nextReminderDate: null, masteredDate: todayStr };
      }
      return {
        ...m,
        longTermStage: nextStage,
        nextReminderDate: addDays(m.loggedDate || todayStr, cumulativeReviewDays[nextStage]),
        longTermHistory: [...(m.longTermHistory || []), todayStr]
      };
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

    const newMistake = {
      id: 'm-' + Date.now(),
      sourceType: mistakeData.sourceType || 'Test Paper',
      sourceName: mistakeData.sourceName,
      exerciseNo: mistakeData.exerciseNo,
      questionNo: mistakeData.questionNo,
      category: mistakeData.category || 'CM',
      formulaNote: mistakeData.formulaNote || '',
      loggedDate: todayStr,
      nextReminderDate: addDays(todayStr, 3),
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
        <NavItem active={activeTab === 'longterm'} onClick={() => setActiveTab('longterm')} icon={RefreshCw} label="7-15-30 Days Spaced Revision" badge={dueLongTermReminders.length} />
        <NavItem active={activeTab === 'mistakes'} onClick={() => setActiveTab('mistakes')} icon={ShieldAlert} label="Mistake Log (Test/Module)" />
        <NavItem active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={Calendar} label="Tasks & Schedule Table" />
        <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Layers} label="Permanent Vault & Stats" />
        <NavItem active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={ShieldAlert} label="Backup & Restore" />
      </aside>

      <main className="md:col-span-9">
        {activeTab === 'dashboard' && (
          <DashboardView tasks={tasks} setTasks={setTasks} mistakes={mistakes} dueReminders={dueReminders} onOpenMistakeModal={(m) => { setMistakeModalMode(m); setEditingMistake(null); setShowMistakeModal(true); }} onOpenTaskModal={(t) => { setEditingTask(t); setShowTaskModal(true); }} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'alerts' && <SpacedRepetitionView dueReminders={dueReminders} onDecision={handleSpacedRepetitionDecision} />}
        {activeTab === 'longterm' && <LongTermRevisionView reminders={longTermReminders} todayStr={todayStr} totalReminders={longTermReminders.length} onReviewed={handleLongTermDecision} />}
        {activeTab === 'mistakes' && <MistakeAnalysisView mistakes={mistakes} onOpenMistakeModal={(m) => { setMistakeModalMode(m); setEditingMistake(null); setShowMistakeModal(true); }} onEditMistake={(m) => { setEditingMistake(m); setMistakeModalMode(m.sourceType); setShowMistakeModal(true); }} onDeleteMistake={handleDeleteMistake} />}
        {activeTab === 'schedule' && <ScheduleView tasks={tasks} setTasks={setTasks} onOpenTaskModal={(t) => { setEditingTask(t); setShowTaskModal(true); }} />}
        {activeTab === 'history' && <HistoryVaultView mistakes={mistakes} onEditMistake={(m) => { setEditingMistake(m); setMistakeModalMode(m.sourceType); setShowMistakeModal(true); }} onDeleteMistake={handleDeleteMistake} />}
        {activeTab === 'backup' && <BackupRestoreView tasks={tasks} tests={tests} mistakes={mistakes} setTasks={setTasks} setTests={setTests} setMistakes={setMistakes} cloudReady={cloudReady} />}
      </main>
    </div>

    {showMistakeModal && <AddMistakeModal mode={mistakeModalMode} editingMistake={editingMistake} onClose={() => { setShowMistakeModal(false); setEditingMistake(null); }} onSubmit={handleAddOrEditMistake} />}
    {showTaskModal && <AddTaskModal initialTask={editingTask} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} onSubmit={handleSaveTask} />}
    <Analytics />
    <SpeedInsights />
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
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium"><span>{t.date}</span><span>•</span><span>Slot: {formatTimeSlot(t.timeSlot)}</span><span>•</span><span className="text-rose-600 font-bold">Deadline: {formatTime(t.deadline)}</span></div>
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

function LongTermRevisionView({ reminders, todayStr, totalReminders, onReviewed }) {
  const stageDays = [16, 31, 61];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">7-15-30 Days Spaced Revision</h2>
        <p className="text-slate-500 text-sm mt-0.5">After the day-3, day-6 and day-9 loop, mastered topics are reviewed on cumulative days 16, 31 and 61 from their original log date.</p>
      </div>
      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-xs text-indigo-900">
        <strong>{totalReminders} topics</strong> are in the long-term cycle. Reviews are due on day 16, day 31 and day 61, all calculated from the original logged date.
      </div>
      {reminders.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-extrabold text-emerald-900 text-base">No Long-term Reviews Due</h3>
          <p className="text-xs text-emerald-700">Topics will appear here after they are mastered in the 3-day loop.</p>
        </div>
      ) : reminders.map(m => {
        const stage = m.longTermStage || 0;
        return (
          <div key={m.id} className="bg-white border border-indigo-200 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2"><span className="bg-indigo-100 text-indigo-800 font-black text-[10px] px-2.5 py-1 rounded-md">Day {stageDays[stage]} • Review {stage + 1}/3</span><span className="text-xs text-slate-500">Logged: {m.loggedDate}</span></div>
            <div><h4 className="font-black text-slate-900 text-base">{m.exerciseNo} ({m.questionNo})</h4><p className="text-xs font-bold text-slate-700">{m.sourceType}: {m.sourceName}</p>{m.formulaNote && <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border mt-2">Note: {m.formulaNote}</p>}</div>
            <div className="pt-3 border-t flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-700">{m.nextReminderDate <= todayStr ? 'Did you complete this revision?' : `Scheduled for ${m.nextReminderDate}`}</p>{m.nextReminderDate <= todayStr ? <button onClick={() => onReviewed(m.id)} className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-4 py-2 rounded-xl">Reviewed — Next Stage</button> : <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg">Upcoming</span>}</div>
          </div>
        );
      })}
    </div>
  );
}

function MistakeAnalysisView({ mistakes, onOpenMistakeModal, onEditMistake, onDeleteMistake }) {
  const [mistakeView, setMistakeView] = useState('active');
  const activeMistakes = mistakes.filter(m => m.status === 'Pending Revision' || m.status === 'Logged');
  const masteredMistakes = mistakes.filter(m => m.status === 'Mastered' || m.status === 'Long-term Revision');
  const visibleMistakes = mistakeView === 'active' ? activeMistakes : masteredMistakes;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Mistake Tracker</h2><p className="text-slate-500 text-sm mt-0.5">Categorized logs for CM, RM, and SM errors.</p></div>
        <div className="flex items-center gap-2"><button onClick={() => onOpenMistakeModal('Test Paper')} className="bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-xl">+ Test Mistake</button><button onClick={() => onOpenMistakeModal('Module/DPP')} className="bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-xl">+ Module Mistake</button></div>
      </div>
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setMistakeView('active')} className={`px-4 py-2 rounded-xl text-xs font-bold ${mistakeView === 'active' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}>Active Loop ({activeMistakes.length})</button>
        <button onClick={() => setMistakeView('mastered')} className={`px-4 py-2 rounded-xl text-xs font-bold ${mistakeView === 'mastered' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-600'}`}>Mastered ({masteredMistakes.length})</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleMistakes.length === 0 ? <div className="col-span-2 bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">{mistakeView === 'active' ? 'No active mistakes. Great work!' : 'No mastered topics yet.'}</div> : visibleMistakes.map(m => (
          <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between"><span className={`px-2.5 py-1 text-[10px] font-black rounded-md ${m.category === 'CM' ? 'bg-rose-100 text-rose-800' : m.category === 'RM' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'}`}>{m.category}</span><span className="text-xs text-slate-400">{m.loggedDate}</span></div>
            <div><h4 className="font-bold text-slate-900 text-sm">{m.exerciseNo} ({m.questionNo})</h4><p className="text-xs font-semibold text-slate-600">{m.sourceType}: {m.sourceName}</p>{m.formulaNote && <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2.5 rounded-lg border">Note: {m.formulaNote}</p>}</div>
            <div className="flex items-center justify-between pt-2 border-t text-xs"><span className="text-amber-700 font-bold">{m.status === 'Long-term Revision' ? `16-31-61 cycle • Stage ${(m.longTermStage || 0) + 1}/3 • Due: ${m.nextReminderDate}` : m.status === 'Mastered' ? 'Fully mastered' : `Next Reminder: ${m.nextReminderDate}`}</span><div className="flex gap-2"><button onClick={() => onEditMistake(m)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button><button onClick={() => onDeleteMistake(m.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></div>
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
                  <td className="p-3.5 text-slate-600"><div>{t.date}</div><div className="text-[10px] text-slate-400 font-bold">{formatTimeSlot(t.timeSlot)}</div></td>
                  <td className="p-3.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.isScheduled ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{t.isScheduled ? 'Scheduled Slot' : 'Unscheduled'}</span></td>
                  <td className="p-3.5"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${t.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{t.priority}</span></td>
                  <td className="p-3.5 font-bold text-rose-600">{formatTime(t.deadline)}</td>
                  <td className="p-3.5 text-right"><div className="inline-flex items-center gap-3"><button onClick={() => onOpenTaskModal(t)} title="Edit task" className="text-slate-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button><button onClick={() => setTasks(prev => prev.filter(item => item.id !== t.id))} title="Delete task" className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
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
  const categories = [
    { key: 'CM', title: 'CM — Conceptual Mistakes', description: 'Concepts or methods that were not understood correctly.', color: 'rose' },
    { key: 'SM', title: 'SM — Silly Mistakes', description: 'Calculation slips, sign errors, or avoidable execution mistakes.', color: 'sky' },
    { key: 'RM', title: 'RM — Reading Mistakes', description: 'Misreading the question, data, or conditions.', color: 'purple' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Permanent Vault & Stats</h2>
        <p className="text-slate-500 text-sm mt-0.5">Mastered questions, grouped by mistake category.</p>
      </div>
      <div className="bg-white p-5 rounded-2xl border shadow-2xs">
        <h3 className="font-extrabold text-slate-900 text-base">Mastered Concepts Vault ({masteredMistakes.length})</h3>
        <p className="text-xs text-slate-500 mt-1">Choose the category that best describes each mistake. Older entries without a category are shown under CM as uncategorized; edit them to assign the correct category.</p>
      </div>

      {categories.map(category => {
        const categoryMistakes = masteredMistakes.filter(m =>
          category.key === 'CM' ? (!m.category || !['CM', 'SM', 'RM'].includes(m.category) || m.category === 'CM') : m.category === category.key
        );
        return (
          <section key={category.key} className="bg-white p-5 rounded-2xl border shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{category.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">{categoryMistakes.length}</span>
            </div>
            {categoryMistakes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No mastered questions in this category yet.</p>
            ) : categoryMistakes.map(m => (
              <div key={m.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-emerald-900">{m.sourceName} — {m.exerciseNo} ({m.questionNo})</span>
                  <p className="text-emerald-700 text-[10px] mt-0.5">{m.formulaNote}</p>
                  {(!m.category || !['CM', 'SM', 'RM'].includes(m.category)) && (
                    <p className="text-amber-700 text-[10px] mt-1 font-semibold">Uncategorized — currently grouped under CM; edit to assign the correct category.</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onEditMistake(m)} className="text-slate-400 hover:text-indigo-600" title="Edit category"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => onDeleteMistake(m.id)} className="text-slate-400 hover:text-rose-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </section>
        );
      })}
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
