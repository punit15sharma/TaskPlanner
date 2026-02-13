// Default projects - users can add more
const DEFAULT_PROJECTS = {
   'HH bbyy': { name: 'HH bbyy', color: '#3b82f6' },
   'EF Tracking': { name: 'EF Tracking', color: '#ef4444' },
   'FCC 6Jets': { name: 'FCC 6Jets', color: '#8b5cf6' },
   'misc-atlas': { name: 'Misc. ATLAS', color: '#f59e0b' },
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
   const ageFactor = Math.min(daysSinceCreation / 7 * 0.5, 2);
   const quickBonus = task.length <= 2 ? 1.5 : 0;
   const easyBonus = task.difficulty <= 2 ? 1 : 0;
   const basePriority = (task.importance * 2) - (task.length + task.difficulty) / 3;
   
   // Deadline factor
   let deadlineFactor = 0;
   if (task.deadline) {
       const daysUntilDeadline = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24);
       // Exponential increase as deadline approaches
       if (daysUntilDeadline < 0) {
           deadlineFactor = 5; // Overdue tasks get high priority
       } else if (daysUntilDeadline < 7) {
           deadlineFactor = 4 * (1 - daysUntilDeadline/7); // Up to 4 points for urgent tasks
       } else if (daysUntilDeadline < 30) {
           deadlineFactor = 2 * (1 - daysUntilDeadline/30); // Up to 2 points for approaching tasks
       }
       // Factor in task length for deadline urgency
       deadlineFactor *= (1 + task.length/5); // Longer tasks get more deadline pressure
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
   const highPriorityTasks = tasks.filter(t => calculatePriority(t) > 10).length;
   const upcomingDeadlines = tasks.filter(t => {
       if (!t.deadline) return false;
       const daysUntilDeadline = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24);
       return daysUntilDeadline < 7;
   }).length;

   // Calculate total workload considering length of each task
   const totalWorkload = tasks.reduce((sum, task) => {
       const lengthWeight = task.length * 0.8;  // Length has more impact
       const priorityBonus = calculatePriority(task) > 10 ? 1.5 : 1;
       const deadlineBonus = task.deadline ?
           ((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24) < 7 ? 1.3 : 1) : 1;
       
       return sum + (lengthWeight * priorityBonus * deadlineBonus);
   }, 0);

   let message, advice;
   if (totalTasks === 0) {
       message = "All clear! 🌟";
       advice = "Enjoy your free time, you've earned it!";
   } 
   else if (totalWorkload > 25) {  // Very high workload
       message = "Your plate is quite full! 🌊";
       advice = "Consider delegating or rescheduling some tasks. Your well-being comes first.";
   }
   else if (totalWorkload > 15) {   // Approaching heavy workload
       message = "Getting busy! 🌱";
       advice = "Be careful about taking on new commitments right now.";
   }
   else if (highPriorityTasks >= 3  && totalWorkload > 10) {
       message = "Some important tasks need attention 📋";
       advice = "Focus on high-priority items first, but take breaks between them.";
   }
   else if (upcomingDeadlines >= 2) {
       message = "Keep an eye on those deadlines ⏰";
       advice = "Plan your week carefully around these key dates.";
   }
   else {
       message = "Workload looks balanced! 💫";
       advice = "You're maintaining a good pace. Keep it up!";
   }
   let workload = "Your workload score is " + Math.round(totalWorkload) + " It's okay to take breaks";
   return { message, advice, workload };
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
