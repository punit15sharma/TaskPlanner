// Default projects - users can add more
const DEFAULT_PROJECTS = {
   'other': { name: 'Other', color: '#6b7280' }
};

// Load projects from localStorage or use defaults
const loadProjects = () => {
   const saved = localStorage.getItem('projects');
   if (saved) {
       const parsed = JSON.parse(saved);
       // Ensure 'other' always exists
       if (!parsed['other']) {
           parsed['other'] = { name: 'Other', color: '#6b7280' };
       }
       return parsed;
   }
   return { ...DEFAULT_PROJECTS };
};

// Save projects to localStorage
const saveProjects = (projects) => {
   localStorage.setItem('projects', JSON.stringify(projects));
};

// Initialize PROJECTS as mutable
let PROJECTS = loadProjects();

const calculatePriority = (task) => {
   const daysSinceCreation = (new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);

   // Age factor: scales with importance so low-importance tasks don't climb indefinitely
   const importanceScale = task.importance / 5;
   const ageFactor = Math.min(daysSinceCreation / 7 * 0.4 * importanceScale, 2);

   // Gradual efficiency bonus: shorter and easier tasks get a smooth bonus (not binary)
   const quickBonus = Math.max(0, (3 - task.length) * 0.5);    // 0-1.0
   const easyBonus  = Math.max(0, (3 - task.difficulty) * 0.35); // 0-0.7

   // Base: importance is the main driver, effort is a moderate drag
   const basePriority = (task.importance * 2.2) - (task.length * 0.4 + task.difficulty * 0.3);

   // Deadline urgency
   let deadlineFactor = 0;
   if (task.deadline) {
       const daysLeft = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24);
       if (daysLeft < 0) {
           deadlineFactor = 5 + Math.min(Math.abs(daysLeft) * 0.3, 3); // Overdue: 5-8 pts
       } else if (daysLeft < 3) {
           deadlineFactor = 4 + (1 - daysLeft / 3);                     // Imminent: 4-5
       } else if (daysLeft < 7) {
           deadlineFactor = 2.5 * (1 - daysLeft / 7);                   // This week: 0-2.5
       } else if (daysLeft < 30) {
           deadlineFactor = 1.2 * (1 - daysLeft / 30);                  // This month: 0-1.2
       }
       // Longer tasks need earlier starts
       deadlineFactor *= (1 + task.length / 6);
   }

   return (basePriority + ageFactor + quickBonus + easyBonus + deadlineFactor).toFixed(1);
};

const formatDate = (dateString) => {
   const date = new Date(dateString);
   return new Intl.DateTimeFormat('en-US', {
       month: 'short',
       day: 'numeric',
       hour: 'numeric',
       minute: 'numeric'
   }).format(date);
};

const getDaysOld = (dateString) => {
   const days = (new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24);
   return Math.floor(days);
};

const analyzeWorkload = (tasks) => {
   const totalTasks = tasks.length;
   if (totalTasks === 0) {
       return { message: "All clear! \u{1F31F}", advice: "Enjoy your free time, you've earned it!", workload: "Workload: 0%" };
   }

   const now = new Date();
   let overdue = 0, urgent = 0;

   // Effort per task: combines length and difficulty, weighted by urgency
   const rawWorkload = tasks.reduce((sum, task) => {
       const effort = (task.length * 0.6 + task.difficulty * 0.4);
       let urgencyMult = 1;
       if (task.deadline) {
           const daysLeft = (new Date(task.deadline) - now) / (1000 * 60 * 60 * 24);
           if (daysLeft < 0) { urgencyMult = 1.6; overdue++; }
           else if (daysLeft < 3) { urgencyMult = 1.4; urgent++; }
           else if (daysLeft < 7) { urgencyMult = 1.2; urgent++; }
       }
       return sum + effort * urgencyMult;
   }, 0);

   // Normalize to 0-100 scale. A "full" workload is ~30 effort-units.
   const pct = Math.min(Math.round(rawWorkload / 30 * 100), 100);

   let message, advice;
   if (overdue > 0) {
       message = overdue + " overdue task" + (overdue > 1 ? 's' : '') + "! \u{1F6A8}";
       advice = "Clear the overdue items first, then reassess your schedule.";
   } else if (pct >= 85) {
       message = "Your plate is quite full! \u{1F30A}";
       advice = "Consider delegating or rescheduling some tasks. Your well-being comes first.";
   } else if (pct >= 60) {
       message = "Getting busy! \u{1F331}";
       advice = "Be careful about taking on new commitments right now.";
   } else if (urgent >= 2) {
       message = "Keep an eye on those deadlines \u23F0";
       advice = "Plan your week carefully around these key dates.";
   } else if (pct >= 35) {
       message = "Steady progress \u{1F4CB}";
       advice = "You're in a good rhythm. Focus on high-priority items when you can.";
   } else {
       message = "Workload looks light! \u{1F4AB}";
       advice = "You've got room. A great time to tackle something you've been putting off.";
   }

   return { message, advice, workload: "Workload: " + pct + "%" };
};

// ─── Calendar Helpers ───────────────────────────────────────────────
const getCalendarDays = (year, month) => {
   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);
   const startPad = firstDay.getDay(); // 0=Sun
   const totalDays = lastDay.getDate();
   
   const days = [];
   // Previous month padding
   const prevLastDay = new Date(year, month, 0).getDate();
   for (let i = startPad - 1; i >= 0; i--) {
       days.push({ day: prevLastDay - i, currentMonth: false });
   }
   // Current month days
   for (let i = 1; i <= totalDays; i++) {
       days.push({ day: i, currentMonth: true });
   }
   // Next month padding
   const remaining = 42 - days.length; // 6 rows * 7 cols
   for (let i = 1; i <= remaining; i++) {
       days.push({ day: i, currentMonth: false });
   }
   return days;
};

const getTasksForDate = (tasks, year, month, day) => {
   const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
   return tasks.filter(task => {
       if (!task.deadline) return false;
       return task.deadline === dateStr;
   });
};

const MONTH_NAMES = [
   'January', 'February', 'March', 'April', 'May', 'June',
   'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── ICS Export ─────────────────────────────────────────────────────
const formatICSDate = (dateStr) => {
   // Convert "YYYY-MM-DD" to "YYYYMMDD"
   return dateStr.replace(/-/g, '');
};

const formatICSDateTime = (dateStr) => {
   // Convert "YYYY-MM-DDTHH:MM" to "YYYYMMDDTHHMMSS"
   const d = new Date(dateStr);
   return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const generateICS = (tasks) => {
   const tasksWithDeadlines = tasks.filter(t => t.deadline);
   if (tasksWithDeadlines.length === 0) {
       alert('No tasks with deadlines to export to calendar.');
       return;
   }

   let ics = [
       'BEGIN:VCALENDAR',
       'VERSION:2.0',
       'PRODID:-//TaskManager//EN',
       'CALSCALE:GREGORIAN',
       'METHOD:PUBLISH',
       'X-WR-CALNAME:Task Manager'
   ];

   tasksWithDeadlines.forEach(task => {
       const projectName = (PROJECTS[task.project] && PROJECTS[task.project].name) || 'Other';
       const uid = `task-${task.id}@taskmanager`;
       const hasTime = task.deadline.includes('T');
       const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

       ics.push('BEGIN:VEVENT');
       ics.push(`UID:${uid}`);
       ics.push(`DTSTAMP:${now}`);

       if (hasTime) {
           const dtstart = formatICSDateTime(task.deadline);
           const endDate = new Date(new Date(task.deadline).getTime() + 3600000); // +1 hour
           const dtend = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
           ics.push(`DTSTART:${dtstart}`);
           ics.push(`DTEND:${dtend}`);
       } else {
           const dtstart = formatICSDate(task.deadline);
           const endDate = new Date(task.deadline);
           endDate.setDate(endDate.getDate() + 1);
           const dtend = endDate.toISOString().split('T')[0].replace(/-/g, '');
           ics.push(`DTSTART;VALUE=DATE:${dtstart}`);
           ics.push(`DTEND;VALUE=DATE:${dtend}`);
       }

       ics.push(`SUMMARY:[${projectName}] ${task.name}`);
       ics.push(`DESCRIPTION:Importance: ${task.importance}/5\\nLength: ${task.length}/5\\nDifficulty: ${task.difficulty}/5\\nPriority Score: ${calculatePriority(task)}`);
       ics.push(`CATEGORIES:${projectName}`);
       ics.push('STATUS:NEEDS-ACTION');
       ics.push('END:VEVENT');
   });

   ics.push('END:VCALENDAR');

   const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `tasks-${new Date().toISOString().split('T')[0]}.ics`;
   a.click();
   URL.revokeObjectURL(url);
};

// Preset colors for new projects
const PROJECT_COLORS = [
   '#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#10b981',
   '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
   '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e'
];
