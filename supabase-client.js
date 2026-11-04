var CRM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseSafeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    // 1. Numeric timestamp string
    if (/^\d+$/.test(trimmed)) {
      const d = new Date(Number(trimmed));
      if (!isNaN(d.getTime())) return d;
    }
    // 2. Named month format: e.g. "04 Nov 2026", "4-Nov-2026", "04 November 2026"
    const namedMonthMatch = trimmed.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]+)[\s\-\/]+(\d{4})/);
    if (namedMonthMatch) {
      const day = parseInt(namedMonthMatch[1], 10);
      const mStr = namedMonthMatch[2].toLowerCase().slice(0, 3);
      const year = parseInt(namedMonthMatch[3], 10);
      const mIdx = CRM_MONTHS.findIndex(m => m.toLowerCase() === mStr);
      if (mIdx !== -1) {
        const d = new Date(year, mIdx, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    // 3. Indian / European DD/MM/YYYY or DD-MM-YYYY format
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    // 4. ISO YYYY-MM-DD format
    const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    // 5. Fallback standard parse
    const normalized = trimmed.replace(/-/g, ' ');
    const d1 = new Date(normalized);
    if (!isNaN(d1.getTime())) return d1;
    const d2 = new Date(trimmed);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function isSameCalendarDay(t1, t2) {
  if (!t1) return false;
  const d1 = parseSafeDate(t1);
  const d2 = parseSafeDate(t2 || Date.now());
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = parseSafeDate(ts);
  if (!d) return String(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = CRM_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function isTodayDate(dateVal, tsVal) {
  if (dateVal && isSameCalendarDay(dateVal, Date.now())) return true;
  if (tsVal && isSameCalendarDay(tsVal, Date.now())) return true;
  return false;
}

/* ====================================================================
   DIGITAL AMNIK CRM — SUPABASE DATA LAYER & REALTIME ENGINE
   Seamless Cloud Sync for Real Agency Data
   ==================================================================== */

// Real Supabase Cloud Credentials (Permanent)
const DEFAULT_SB_URL = 'https://rggrpzqexmiptalkgvhp.supabase.co';
const DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ3JwenFleG1pcHRhbGtndmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjM0NTgsImV4cCI6MjEwODIzOTQ1OH0.b0MspPWzcLbOqVPimXF6Um0A8l7S37Dpi1KVLSnGMd0';

// Immediately purge any broken/corrupted URLs from previous user inputs
try {
  localStorage.removeItem('da_sb_url');
  localStorage.removeItem('da_sb_key');
} catch (e) {}

const SupabaseConfig = {
  getUrl() {
    return DEFAULT_SB_URL;
  },
  getKey() {
    return DEFAULT_SB_KEY;
  },
  isConfigured() {
    return true;
  },
  initClient() {
    if (window.supabase) {
      try {
        window.sbClient = window.supabase.createClient(DEFAULT_SB_URL, DEFAULT_SB_KEY);
        console.log('✅ Supabase Cloud connected successfully!');
        this.updateStatusBadge(true);
        this.setupRealtimeSubscriptions();
        return window.sbClient;
      } catch (err) {
        console.error('❌ Supabase init error:', err);
        this.updateStatusBadge(false);
      }
    }
    return null;
  },
  updateStatusBadge(connected, note) {
    const badges = document.querySelectorAll('.supabase-status-badge');
    badges.forEach(b => {
      b.style.display = 'none';
    });
  },
  setupRealtimeSubscriptions() {
    if (!window.sbClient) return;
    try {
      const channel = window.sbClient.channel('realtime:da_crm');

      // Listen for project changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        console.log('⚡ Realtime Project Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncProjectsRealtime(payload);
        }
      });

      // Listen for client changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
        console.log('⚡ Realtime Client Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncClientsRealtime(payload);
        }
      });

      // Listen for team member changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload) => {
        console.log('⚡ Realtime Team Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncTeamRealtime(payload);
        }
      });

      // Listen for calendar changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'calendars' }, (payload) => {
        console.log('⚡ Realtime Calendar Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncCalendarsRealtime(payload);
        }
      });

      // Listen for attendance logs changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, (payload) => {
        console.log('⚡ Realtime Attendance Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncAttendanceRealtime(payload);
        }
      });

      // Listen for time logs changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, (payload) => {
        console.log('⚡ Realtime Time Log Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncTimeRealtime(payload);
        }
      });

      // Listen for activity logs changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, (payload) => {
        console.log('⚡ Realtime Activity Change:', payload);
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.syncActivityRealtime(payload);
        }
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Supabase Realtime Stream Connected!');
        }
      });
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }
};

// ====================================================================
// STATE BRIDGE & UI SYNC HELPERS (SHARED BETWEEN PORTAL & ADMIN)
// ====================================================================
function getActiveCRMState() {
  if (typeof STATE !== 'undefined' && STATE && typeof STATE === 'object') {
    return STATE;
  }
  if (typeof getCRMState === 'function') {
    return getCRMState();
  }
  try {
    const raw = localStorage.getItem('da_crm_state_v3') || localStorage.getItem('da_crm_state_v2');
    return raw ? JSON.parse(raw) : { clients: [], team: [], projects: [], calendars: [], attendance: { status: 'out' } };
  } catch (e) {
    return { clients: [], team: [], projects: [], calendars: [], attendance: { status: 'out' } };
  }
}

function persistActiveCRMState(st) {
  if (typeof save === 'function') {
    try { save(); } catch (e) {}
  }
  if (typeof saveCRMState === 'function') {
    try { saveCRMState(st); } catch (e) {}
  }
  try {
    localStorage.setItem('da_crm_state_v3', JSON.stringify(st));
  } catch (e) {}
}

function triggerAllUIRenders() {
  if (typeof syncProfileUI === 'function') syncProfileUI();
  if (typeof renderProjects === 'function') renderProjects();
  if (typeof renderCalendars === 'function') renderCalendars();
  if (typeof updateDashCounts === 'function') updateDashCounts();
  if (typeof syncAttendanceUI === 'function') syncAttendanceUI();
  if (typeof renderAttLog === 'function') renderAttLog();
  if (typeof renderAdminClients === 'function') renderAdminClients();
  if (typeof renderAdminEmployees === 'function') renderAdminEmployees();
  if (typeof renderAdminProjectsTime === 'function') renderAdminProjectsTime();
  if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
  if (typeof renderAdminAttendanceTable === 'function') renderAdminAttendanceTable();
  if (typeof renderAdminAttendanceHistory === 'function') renderAdminAttendanceHistory();
  if (typeof updateAdminKpis === 'function') updateAdminKpis();
  if (typeof renderLiveWorkAndCompletions === 'function') renderLiveWorkAndCompletions();

  const st = getActiveCRMState();
  if (st && st.attendance && (st.attendance.status === 'in' || st.attendance.status === 'lunch')) {
    if (typeof startAttElapsed === 'function') startAttElapsed();
  }
  if (st && st.activeProjectTimer) {
    if (typeof updateProjectTimerTicker === 'function') updateProjectTimerTicker();
    if (typeof syncActiveTaskTopbar === 'function') syncActiveTaskTopbar();
  }
}

// ====================================================================
// SUPABASE DATA OPERATIONS (CRUD)
// ====================================================================
const SupabaseData = {
  // 1. Initial Load of All Real Data from Supabase
  async loadAll() {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return false;

    try {
      const st = getActiveCRMState();

      // 1. Fetch Clients
      const { data: clientsData, error: clientErr } = await window.sbClient
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (!clientErr && Array.isArray(clientsData)) {
        st.clients = clientsData.map(c => ({
          id: c.id,
          name: c.name,
          industry: c.industry,
          status: c.status,
          lead: c.lead,
          notes: c.notes,
          createdAt: new Date(c.created_at).getTime(),
        }));
      }

      // 2. Fetch Team Members
      const { data: teamData, error: teamErr } = await window.sbClient
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (!teamErr && Array.isArray(teamData) && teamData.length > 0) {
        st.team = teamData.map(m => ({
          id: String(m.id || '').trim().toLowerCase(),
          name: m.name,
          role: m.role,
          shift: m.shift === '10:00 AM – 07:00 PM' ? '10:30 AM – 07:00 PM' : (m.shift || '10:30 AM – 07:00 PM'),
          password: m.password,
          isFounder: m.is_founder,
          email: m.email,
          phone: m.phone,
          photoUrl: m.photo_url || null,
          lateLunchReason: m.late_lunch_reason,
          lateLunchTime: m.late_lunch_time,
          domains: m.role ? String(m.role).split(',').map(s => s.trim()).filter(Boolean) : ['Video Editor'],
          addedAt: new Date(m.created_at).getTime(),
        }));
      }

      // 3. Fetch Deliverables / Projects
      const { data: projData, error: projErr } = await window.sbClient
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!projErr && Array.isArray(projData)) {
        st.projects = projData
          .filter(p => p && p.id !== 'mvm1nuia2euxf' && !/automated growth campaign/i.test(p.name || ''))
          .map(p => ({
          id: p.id,
          name: p.name,
          client: p.client,
          service: p.service,
          priority: p.priority,
          status: p.status,
          deadline: p.deadline,
          assigned: Array.isArray(p.assigned) ? p.assigned : [],
          desc: p.description,
          totalTimeSpent: Number(p.total_time_spent) || 0,
          sessions: Array.isArray(p.sessions) ? p.sessions : [],
          createdBy: p.created_by,
          createdAt: new Date(p.created_at).getTime(),
        }));
      }

      // 4. Fetch Content Calendars
      const { data: calData, error: calErr } = await window.sbClient
        .from('calendars')
        .select('*')
        .order('created_at', { ascending: false });

      if (!calErr && Array.isArray(calData)) {
        st.calendars = calData.map(c => ({
          id: c.id,
          client: c.client,
          month: c.month,
          monthLabel: c.month_label,
          title: c.title,
          fileName: c.file_name,
          fileUrl: c.file_url,
          fileSize: c.file_size,
          uploadedBy: c.uploaded_by,
          notes: c.notes,
          uploadedAt: new Date(c.created_at).getTime(),
        }));
      }

      // 5. Fetch Attendance Logs (Fetch up to 1000 records for full historical archive)
      const { data: attData, error: attErr } = await window.sbClient
        .from('attendance_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!attErr && Array.isArray(attData)) {
        window._adminAttLogs = attData.map(a => {
          const photo = a.photo_url || (a.late_lunch_reason && String(a.late_lunch_reason).startsWith('photo:') ? a.late_lunch_reason.slice(6) : null);
          const cleanReason = (a.late_lunch_reason && String(a.late_lunch_reason).startsWith('photo:')) ? null : a.late_lunch_reason;
          const ciTime = Number(a.check_in) || 0;
          let isLateCalc = false;
          let lateMinsCalc = 0;
          if (ciTime > 0) {
            const d = new Date(ciTime);
            const hourFrac = d.getHours() + (d.getMinutes() / 60);
            if (hourFrac > 10.5) {
              isLateCalc = true;
              lateMinsCalc = Math.round((hourFrac - 10.5) * 60);
            }
          }
          return {
            ...a,
            photo_url: photo,
            photoUrl: photo,
            late_lunch_reason: cleanReason,
            lateLunchReason: cleanReason,
            is_late: (typeof a.is_late !== 'undefined' && a.is_late !== null) ? Boolean(a.is_late) : isLateCalc,
            isLate: (typeof a.is_late !== 'undefined' && a.is_late !== null) ? Boolean(a.is_late) : isLateCalc,
            late_minutes: a.late_minutes || lateMinsCalc,
            is_lunch_late: (typeof a.is_lunch_late !== 'undefined' && a.is_lunch_late !== null) ? Boolean(a.is_lunch_late) : false,
            isLunchLate: (typeof a.is_lunch_late !== 'undefined' && a.is_lunch_late !== null) ? Boolean(a.is_lunch_late) : false,
            lunch_duration: a.lunch_duration || '0m',
            lunchDuration: a.lunch_duration || '0m',
            projects_worked: Array.isArray(a.projects_worked) ? a.projects_worked : [],
            projectsWorked: Array.isArray(a.projects_worked) ? a.projects_worked : [],
            tasks_summary: a.tasks_summary || '',
            tasksSummary: a.tasks_summary || '',
          };
        });

        if (!st.attendance) st.attendance = { status: 'out' };

        // Hydrate employee attendance history table with this employee's records
        const activeEmp = localStorage.getItem('da_logged_in_emp') || (st.employee && st.employee.id);
        const normEmpId = activeEmp ? String(activeEmp).toLowerCase().replace(/[^a-z0-9]/g, '') : '';

        const myLogs = normEmpId 
          ? window._adminAttLogs.filter(a => {
              const aId = String(a.employee_id || a.employeeId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return aId === normEmpId;
            })
          : window._adminAttLogs;

        st.attendance.log = myLogs.map(a => ({
          id: a.id,
          employeeId: a.employee_id,
          employeeName: a.employee_name,
          date: a.date,
          checkIn: a.check_in,
          lunchStart: a.lunch_start,
          lunchEnd: a.lunch_end,
          checkOut: a.check_out,
          effectiveHours: a.effective_hours,
          lateLunchReason: a.late_lunch_reason,
          status: a.status,
          photoUrl: a.photo_url,
          isLate: a.is_late,
          lateMinutes: a.late_minutes,
          isLunchLate: a.is_lunch_late,
          lunchDuration: a.lunch_duration,
          projectsWorked: a.projects_worked,
          tasksSummary: a.tasks_summary,
          createdAt: a.created_at,
        }));
      }

      // 5b. Fetch Time Logs (Project Sessions History)
      try {
        const { data: timeData, error: timeErr } = await window.sbClient
          .from('time_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (!timeErr && Array.isArray(timeData)) {
          st.timeLogs = timeData;
          window._adminTimeLogs = timeData;
        }
      } catch (tErr) {
        console.warn('time_logs fetch warning:', tErr);
      }

      // 6. Fetch Activity Logs (Cloud Audit Trail)
      try {
        const { data: actData, error: actErr } = await window.sbClient
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!actErr && Array.isArray(actData)) {
          window._adminActivities = actData;
          st.activityLog = actData.map(a => ({
            id: a.id,
            text: a.text,
            color: a.color || 'purple',
            time: new Date(a.created_at).getTime(),
            date: typeof fmtDate === 'function' ? fmtDate(new Date(a.created_at).getTime()) : ''
          }));
          if (typeof renderActivity === 'function') renderActivity();
          if (typeof renderAdminActivities === 'function') renderAdminActivities();
        }
      } catch (actE) {
        console.warn('Activity fetch warning:', actE);
      }

      // Background Maintenance: Auto-purge check-in photos older than 7 days
      this.purgeOldPhotos();

      // 7. RESTORE ACTIVE LOGGED-IN EMPLOYEE ATTENDANCE SESSION FROM SUPABASE CLOUD
      try {
        const loggedId = localStorage.getItem('da_logged_in_emp') || (st && st.employee && st.employee.id);
        const loggedName = (st && st.employee && st.employee.name) || '';
        if ((loggedId || loggedName) && Array.isArray(attData)) {
          const empNorm = loggedId ? String(loggedId).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const currentEmpName = loggedName ? loggedName.trim().toLowerCase() : '';
          const todayDateStr = typeof fmtDate === 'function' ? fmtDate(Date.now()) : '';
          
          const myTodayAtt = attData.find(a => {
            const aEmpId = String(a.employee_id || a.employeeId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const aEmpName = String(a.employee_name || a.employeeName || '').trim().toLowerCase();
            const idMatches = empNorm && (aEmpId === empNorm);
            const nameMatches = currentEmpName && (aEmpName === currentEmpName);
            if (!idMatches && !nameMatches) return false;
            return isTodayDate(a.date, a.check_in || a.created_at);
          });

          if (myTodayAtt) {
            if (!st.attendance) st.attendance = {};
            const parsedCheckIn = parseSafeDate(myTodayAtt.check_in || myTodayAtt.checkIn);
            st.attendance.checkInTime = parsedCheckIn ? parsedCheckIn.getTime() : (Number(myTodayAtt.check_in) || myTodayAtt.checkIn);
            
            const parsedLunchStart = parseSafeDate(myTodayAtt.lunch_start);
            st.attendance.lunchStartTime = parsedLunchStart ? parsedLunchStart.getTime() : (myTodayAtt.lunch_start ? Number(myTodayAtt.lunch_start) : null);
            
            const parsedLunchEnd = parseSafeDate(myTodayAtt.lunch_end);
            st.attendance.lunchEndTime = parsedLunchEnd ? parsedLunchEnd.getTime() : (myTodayAtt.lunch_end ? Number(myTodayAtt.lunch_end) : null);
            
            const parsedCheckOut = parseSafeDate(myTodayAtt.check_out);
            st.attendance.checkOutTime = parsedCheckOut ? parsedCheckOut.getTime() : (myTodayAtt.check_out ? Number(myTodayAtt.check_out) : null);
            
            st.attendance.photoUrl = myTodayAtt.photo_url || null;
            st.attendance.lateLunchReason = myTodayAtt.late_lunch_reason || null;

            if (st.attendance.checkOutTime || myTodayAtt.status === 'done') {
              st.attendance.status = 'done';
            } else if ((st.attendance.lunchStartTime && !st.attendance.lunchEndTime) || myTodayAtt.status === 'lunch') {
              st.attendance.status = 'lunch';
            } else if (st.attendance.checkInTime || myTodayAtt.status === 'in') {
              st.attendance.status = 'in'; // ACTIVE PUNCH IN RESTORED!
            }

            // Cache active attendance session locally as immediate offline backup
            try {
              if (todayDateStr && empNorm) {
                localStorage.setItem(`da_att_${empNorm}_${todayDateStr}`, JSON.stringify(st.attendance));
              }
              if (typeof save === 'function') save();
            } catch (e) {}

            console.log(`✅ Restored active attendance session for ${loggedId || loggedName}: status=${st.attendance.status}, checkIn=${st.attendance.checkInTime}`);
            if (typeof syncAttendanceUI === 'function') syncAttendanceUI();
            if (typeof renderAttLog === 'function') renderAttLog();
            if ((st.attendance.status === 'in' || st.attendance.status === 'lunch') && typeof startAttElapsed === 'function') {
              startAttElapsed();
            }
          } else {
            // No record for today in cloud: if local attendance has a previous day checkIn, reset it
            if (st.attendance && st.attendance.checkInTime && !isSameCalendarDay(st.attendance.checkInTime, Date.now())) {
              console.log(`🌅 Resetting stale previous-day shift in local attendance state for ${loggedId || loggedName}`);
              st.attendance.status = 'out';
              st.attendance.checkInTime = null;
              st.attendance.lunchStartTime = null;
              st.attendance.lunchEndTime = null;
              st.attendance.checkOutTime = null;
              st.attendance.photoUrl = null;
              st.attendance.lateLunchReason = null;
              if (typeof syncAttendanceUI === 'function') syncAttendanceUI();
              if (typeof renderAttLog === 'function') renderAttLog();
            }
          }
        }
      } catch (attRestErr) {
        console.warn('Attendance session restoration warning:', attRestErr);
      }

      // 8. RESTORE ACTIVE PROJECT WORK TIMER FROM SUPABASE CLOUD (ZERO-DEVICE DEPENDENCY)
      // Even if laptop shuts down or browser tab is closed, active work session continues in Supabase
      try {
        const loggedId = localStorage.getItem('da_logged_in_emp') || (st && st.employee && st.employee.id);
        const loggedName = (st && st.employee && st.employee.name) || '';
        if (loggedId && Array.isArray(st.projects)) {
          const empNorm = String(loggedId).toLowerCase().replace(/[^a-z0-9]/g, '');
          let activeSession = null;
          let activeProj = null;

          // 1st Check: Look for active session in Supabase projects.sessions
          for (const p of st.projects) {
            if (Array.isArray(p.sessions)) {
              const found = p.sessions.find(s => {
                if (!s || !s.isActive) return false;
                const sTime = Number(s.startTime) || 0;
                // Allow sessions started within the last 24 hours
                if (sTime && (Date.now() - sTime) > 24 * 3600 * 1000) return false;
                const sUid = String(s.userId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const sUname = String(s.userName || s.user || '').trim().toLowerCase();
                return (sUid === empNorm || (loggedName && sUname === loggedName.toLowerCase()));
              });
              if (found) {
                activeSession = found;
                activeProj = p;
                break;
              }
            }
          }

          // 2nd Check: Look in dedicated localStorage backup
          if (!activeProj) {
            try {
              const savedTimer = localStorage.getItem(`da_active_timer_${empNorm}`);
              if (savedTimer) {
                const parsed = JSON.parse(savedTimer);
                if (parsed && parsed.projectId && (Date.now() - (Number(parsed.startTime) || 0) < 24 * 3600 * 1000)) {
                  const matchedProj = st.projects.find(p => p.id === parsed.projectId);
                  if (matchedProj) {
                    activeProj = matchedProj;
                    activeSession = { startTime: Number(parsed.startTime) };
                  }
                }
              }
            } catch (e) {}
          }

          if (activeProj && activeSession) {
            st.activeProjectTimer = {
              projectId: activeProj.id,
              startTime: Number(activeSession.startTime) || Date.now()
            };
            try {
              localStorage.setItem(`da_active_timer_${empNorm}`, JSON.stringify(st.activeProjectTimer));
            } catch (e) {}
            console.log(`⏱️ Restored live cloud project timer for "${activeProj.name}" from Supabase Cloud (Started: ${typeof fmt === 'function' ? fmt(st.activeProjectTimer.startTime) : st.activeProjectTimer.startTime})`);
            if (typeof updateProjectTimerTicker === 'function') updateProjectTimerTicker();
            if (typeof syncActiveTaskTopbar === 'function') syncActiveTaskTopbar();
            if (typeof renderProjects === 'function') renderProjects();
            if (typeof renderAdminProjectsTime === 'function') renderAdminProjectsTime();
          } else if (!activeProj && st.activeProjectTimer) {
            // Verify if existing local timer is stale (more than 24h old)
            if (st.activeProjectTimer.startTime && (Date.now() - st.activeProjectTimer.startTime > 24 * 3600 * 1000)) {
              st.activeProjectTimer = null;
              try { localStorage.removeItem(`da_active_timer_${empNorm}`); } catch (e) {}
            }
          }
        }
      } catch (timerRestErr) {
        console.warn('Active project timer cloud restoration warning:', timerRestErr);
      }

      // Keep active logged-in employee in sync with database record
      if (st && st.employee && Array.isArray(st.team)) {
        const empNorm = String(st.employee.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = st.team.find(m => String(m.id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === empNorm || (m.name && m.name.toLowerCase() === (st.employee.name || '').toLowerCase()));
        if (matched) {
          st.employee.name = matched.name;
          st.employee.role = matched.role;
          if (matched.photoUrl) {
            st.employee.avatar = matched.photoUrl;
            st.employee.photoUrl = matched.photoUrl;
          }
        }
      }
      console.log('📦 Data successfully hydrated from Supabase Cloud!');
      persistActiveCRMState(st);
      triggerAllUIRenders();
      return true;
    } catch (e) {
      console.warn('Error loading from Supabase:', e);
      return false;
    }
  },

  // 2. PROJECT OPERATIONS
  async upsertProject(proj) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const row = {
        id: proj.id,
        name: proj.name,
        client: proj.client || '',
        service: proj.service || 'Video Editor',
        priority: proj.priority || 'Medium',
        status: proj.status || 'Assigned',
        deadline: proj.deadline || '',
        assigned: proj.assigned || [],
        description: proj.desc || '',
        total_time_spent: proj.totalTimeSpent || 0,
        sessions: proj.sessions || [],
        created_by: proj.createdBy || ((typeof STATE !== 'undefined' && STATE && STATE.employee && STATE.employee.name) ? STATE.employee.name : 'Admin'),
        created_at: new Date(proj.createdAt || Date.now()).toISOString(),
      };
      const { error } = await window.sbClient.from('projects').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase upsertProject error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  async deleteProject(id) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const { error } = await window.sbClient.from('projects').delete().eq('id', id);
      if (error) console.error('Supabase deleteProject error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  // 3. CLIENT OPERATIONS
  async upsertClient(c) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const row = {
        id: c.id,
        name: c.name,
        industry: c.industry || 'Digital Marketing & Media',
        status: c.status || 'Active',
        lead: c.lead || 'Amaan Khan (Owner)',
        notes: c.notes || '',
        created_at: new Date(c.createdAt || Date.now()).toISOString(),
      };
      const { error } = await window.sbClient.from('clients').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase upsertClient error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  async deleteClient(id) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const { error } = await window.sbClient.from('clients').delete().eq('id', id);
      if (error) console.error('Supabase deleteClient error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  // 4. TEAM MEMBER OPERATIONS
  async upsertTeamMember(m) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const row = {
        id: String(m.id || '').trim().toLowerCase(),
        name: m.name,
        role: m.role || 'Video Editor',
        shift: m.shift === '10:00 AM – 07:00 PM' ? '10:30 AM – 07:00 PM' : (m.shift || '10:30 AM – 07:00 PM'),
        password: m.password || '123',
        is_founder: Boolean(m.isFounder || (m.id && m.id.toLowerCase().replace('-', '') === 'emp000')),
        email: m.email || '',
        phone: m.phone || '',
        late_lunch_reason: m.lateLunchReason || null,
        late_lunch_time: m.lateLunchTime || null,
        created_at: new Date(m.addedAt || Date.now()).toISOString(),
      };
      if (m.photoUrl || m.avatar) {
        row.photo_url = m.photoUrl || m.avatar;
      }
      let { error } = await window.sbClient.from('team_members').upsert(row, { onConflict: 'id' });
      if (error && row.photo_url) {
        delete row.photo_url;
        const res2 = await window.sbClient.from('team_members').upsert(row, { onConflict: 'id' });
        if (res2.error) console.error('Supabase upsertTeamMember error:', res2.error);
      } else if (error) {
        console.error('Supabase upsertTeamMember error:', error);
      }
    } catch (e) {
      console.error(e);
    }
  },

  async deleteTeamMember(id) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const { error } = await window.sbClient.from('team_members').delete().eq('id', String(id || '').trim().toLowerCase());
      if (error) console.error('Supabase deleteTeamMember error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  // 5. CALENDAR OPERATIONS
  async upsertCalendar(cal) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const creatorName = (typeof STATE !== 'undefined' && STATE.employee && STATE.employee.name) ? STATE.employee.name : 'Admin';
      const row = {
        id: cal.id,
        client: cal.client,
        month: cal.month,
        month_label: cal.monthLabel,
        title: cal.title,
        file_name: cal.fileName,
        file_url: cal.fileUrl,
        file_size: cal.fileSize || '',
        uploaded_by: cal.uploadedBy || creatorName,
        notes: cal.notes || '',
        created_at: new Date(cal.uploadedAt || Date.now()).toISOString(),
      };
      const { error } = await window.sbClient.from('calendars').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase upsertCalendar error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  async deleteCalendar(id) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const { error } = await window.sbClient.from('calendars').delete().eq('id', id);
      if (error) console.error('Supabase deleteCalendar error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  // 6. ATTENDANCE LOG OPERATIONS (DETERMINISTIC ID PER EMPLOYEE PER DAY)
  async logAttendance(entry) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const currentEmpId = (typeof STATE !== 'undefined' && STATE.employee && STATE.employee.id) ? STATE.employee.id : 'emp001';
      const currentEmpName = (typeof STATE !== 'undefined' && STATE.employee && STATE.employee.name) ? STATE.employee.name : 'Specialist';
      const rawEmpId = String(entry.employee_id || entry.employeeId || currentEmpId).trim().toLowerCase();
      const rawEmpName = entry.employeeName || entry.employee_name || currentEmpName;
      const rawDate = String(entry.date || '').trim() || (typeof fmtDate === 'function' ? fmtDate(Date.now()) : '');
      const sanitizedDate = rawDate.replace(/[^a-zA-Z0-9]/g, '_');
      const deterministicId = entry.id || `att_${rawEmpId.replace(/[^a-z0-9]/g, '')}_${sanitizedDate}`;

      const photo = entry.photoUrl || entry.photo_url || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.photoUrl) ? STATE.attendance.photoUrl : null);
      const rawCheckIn = typeof entry.checkIn === 'number' ? entry.checkIn : (typeof entry.check_in === 'number' ? entry.check_in : ((typeof STATE !== 'undefined' && STATE.attendance && typeof STATE.attendance.checkInTime === 'number') ? STATE.attendance.checkInTime : Date.now()));
      const rawLunchStart = entry.lunchStart || entry.lunch_start || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.lunchStartTime) ? STATE.attendance.lunchStartTime : null);
      const rawLunchEnd = entry.lunchEnd || entry.lunch_end || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.lunchEndTime) ? STATE.attendance.lunchEndTime : null);
      const rawCheckOut = entry.checkOut || entry.check_out || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.checkOutTime) ? STATE.attendance.checkOutTime : null);
      const rawStatus = entry.status || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.status) ? STATE.attendance.status : (rawLunchStart && !rawLunchEnd ? 'lunch' : 'in'));

      // 1. Calculate check-in late status (Official shift start is 10:30 AM)
      let isLate = false;
      let lateMins = 0;
      if (rawCheckIn) {
        const d = new Date(rawCheckIn);
        const hourVal = d.getHours() + (d.getMinutes() / 60);
        if (hourVal > 10.5) {
          isLate = true;
          lateMins = Math.round((hourVal - 10.5) * 60);
        }
      }

      // 2. Calculate lunch duration & late lunch flag (exceeded 60 mins or post-3PM)
      let lunchDurStr = '0m';
      let isLunchLate = false;
      if (rawLunchStart) {
        const endMs = rawLunchEnd || (rawStatus === 'lunch' ? Date.now() : rawLunchStart);
        const diffMs = Math.max(0, endMs - rawLunchStart);
        const totalM = Math.round(diffMs / 60000);
        const h = Math.floor(totalM / 60);
        const m = totalM % 60;
        lunchDurStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        const startHour = new Date(rawLunchStart).getHours();
        const endHour = rawLunchEnd ? new Date(rawLunchEnd).getHours() : startHour;
        if (totalM > 60 || startHour >= 15 || endHour >= 15 || Boolean(entry.lateLunchReason || entry.late_lunch_reason)) {
          isLunchLate = true;
        }
      }

      // 3. Compile projects & deliverables worked on that day
      let projectsWorked = [];
      try {
        const normId = rawEmpId.replace(/[^a-z0-9]/g, '');
        const normName = rawEmpName.toLowerCase().trim();
        const stateProjects = (typeof STATE !== 'undefined' && Array.isArray(STATE.projects)) ? STATE.projects : [];
        stateProjects.forEach(p => {
          if (Array.isArray(p.sessions)) {
            const myDaySessions = p.sessions.filter(s => {
              if (!s) return false;
              const sDate = s.date || (s.startTime && typeof fmtDate === 'function' ? fmtDate(s.startTime) : '');
              if (sDate !== rawDate) return false;
              const sUid = String(s.userId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const sUname = String(s.userName || s.user || '').toLowerCase().trim();
              return (sUid === normId || (normName && sUname === normName));
            });
            if (myDaySessions.length > 0) {
              const totalMs = myDaySessions.reduce((acc, s) => acc + (Number(s.durationMs) || 0), 0);
              projectsWorked.push({
                id: p.id,
                name: p.name,
                client: p.client || '',
                durationStr: typeof fmtDuration === 'function' ? fmtDuration(totalMs) : `${Math.round(totalMs/60000)}m`,
                durationMs: totalMs,
                sessionsCount: myDaySessions.length
              });
            }
          }
        });
      } catch (projErr) {
        console.warn('Projects summary compile warning:', projErr);
      }

      const tasksSummary = projectsWorked.length > 0
        ? `${projectsWorked.length} Deliverable(s): ` + projectsWorked.map(p => `${p.name} (${p.durationStr})`).join(', ')
        : '';

      const cleanReason = (entry.lateLunchReason || entry.late_lunch_reason || null);
      const finalReason = (cleanReason && cleanReason.startsWith('photo:')) ? null : cleanReason;

      const row = {
        id: deterministicId,
        employee_id: rawEmpId,
        employee_name: rawEmpName,
        date: rawDate,
        check_in: rawCheckIn,
        lunch_start: rawLunchStart,
        lunch_end: rawLunchEnd,
        check_out: rawCheckOut,
        effective_hours: entry.effectiveHours || entry.effective_hours || '0h 0m',
        late_lunch_reason: finalReason,
        status: rawStatus,
        photo_url: photo,
        is_late: isLate,
        late_minutes: lateMins,
        lunch_duration: lunchDurStr,
        is_lunch_late: isLunchLate,
        projects_worked: projectsWorked,
        projects_count: projectsWorked.length,
        tasks_summary: tasksSummary,
        created_at: new Date().toISOString(),
      };

      // Upsert to Supabase with automatic resilient fallback
      let { error } = await window.sbClient.from('attendance_logs').upsert(row, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase logAttendance initial upsert note (fallback to base schema):', error.message);
        const baseRow = {
          id: deterministicId,
          employee_id: rawEmpId,
          employee_name: rawEmpName,
          date: rawDate,
          check_in: rawCheckIn,
          lunch_start: rawLunchStart,
          lunch_end: rawLunchEnd,
          check_out: rawCheckOut,
          effective_hours: entry.effectiveHours || entry.effective_hours || '0h 0m',
          late_lunch_reason: finalReason || (tasksSummary ? `Tasks: ${tasksSummary}` : null),
          status: rawStatus,
          created_at: new Date().toISOString(),
        };
        const retryRes = await window.sbClient.from('attendance_logs').upsert(baseRow, { onConflict: 'id' });
        if (retryRes.error) {
          console.error('Supabase logAttendance fallback error:', retryRes.error);
        } else {
          console.log('✅ Attendance logged via resilient base schema for:', rawEmpId);
        }
      } else {
        console.log('✅ Attendance successfully logged to Supabase with full schema for:', rawEmpId);
      }

      // Keep local admin & employee attendance logs in instant sync
      if (!Array.isArray(window._adminAttLogs)) window._adminAttLogs = [];
      const updatedLocal = {
        ...row,
        photo_url: photo,
        projects_worked: projectsWorked,
        tasks_summary: tasksSummary
      };
      const idx = window._adminAttLogs.findIndex(a => a.id === deterministicId || ((a.employee_id || a.employeeId) === rawEmpId && a.date === rawDate));
      if (idx !== -1) {
        window._adminAttLogs[idx] = { ...window._adminAttLogs[idx], ...updatedLocal };
      } else {
        window._adminAttLogs.unshift(updatedLocal);
      }
    } catch (e) {
      console.error('logAttendance exception:', e);
    }
  },

  // 7. BILLABLE PROJECT TIME LOG OPERATIONS
  async logTime(session) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const row = {
        id: session.id || ('tl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
        project_id: session.projectId || session.project_id || '',
        project_name: session.projectName || session.project_name || '',
        user_name: session.user || session.userName || (typeof STATE !== 'undefined' && STATE.employee && STATE.employee.name) || '',
        date: session.date || (typeof fmtDate === 'function' ? fmtDate(Date.now()) : ''),
        start_time: session.start || session.start_time || '',
        end_time: session.end || session.end_time || '',
        duration_ms: session.durationMs || session.duration_ms || 0,
        duration_str: session.durationStr || session.duration_str || '0h 0m',
        created_at: new Date().toISOString()
      };
      const { error } = await window.sbClient.from('time_logs').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('logTime warning:', error.message);
      } else {
        console.log('✅ Session saved to Supabase time_logs:', row.project_name);
        if (!Array.isArray(window._adminTimeLogs)) window._adminTimeLogs = [];
        window._adminTimeLogs.unshift(row);
      }
    } catch (e) {
      console.warn('logTime exception:', e);
    }
  },

  // 8. ACTIVITY LOG OPERATIONS (CLOUD AUDIT STREAM)
  async logActivity(entry) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const actId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const text = typeof entry === 'string' ? entry : (entry.text || '');
      const color = (typeof entry === 'object' && entry.color) ? entry.color : 'purple';
      const row = {
        id: actId,
        text: text,
        color: color,
        created_at: new Date().toISOString()
      };
      const { data, error } = await window.sbClient.from('activity_logs').insert([row]).select();
      if (error) {
        console.warn('Supabase logActivity warning:', error.message);
      } else {
        console.log('✅ Activity logged to Supabase backend:', text);
        if (Array.isArray(window._adminActivities)) {
          window._adminActivities.unshift(row);
        }
      }
    } catch (e) {
      console.warn('logActivity exception:', e);
    }
  },

  async fetchActivities() {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return [];
    try {
      const { data, error } = await window.sbClient
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('fetchActivities warning:', error.message);
        return [];
      }
      window._adminActivities = data || [];
      return data || [];
    } catch (e) {
      console.warn('fetchActivities exception:', e);
      return [];
    }
  },

  syncActivityRealtime(payload) {
    const { eventType, new: newRow } = payload;
    if (eventType === 'INSERT' && newRow) {
      if (!window._adminActivities) window._adminActivities = [];
      if (!window._adminActivities.some(a => a.id === newRow.id)) {
        window._adminActivities.unshift(newRow);
      }

      if (typeof STATE !== 'undefined' && Array.isArray(STATE.activityLog)) {
        const item = {
          id: newRow.id,
          text: newRow.text,
          color: newRow.color || 'purple',
          time: new Date(newRow.created_at).getTime(),
          date: typeof fmtDate === 'function' ? fmtDate(new Date(newRow.created_at).getTime()) : ''
        };
        const exists = STATE.activityLog.some(a => a.id === item.id || (a.text === item.text && Math.abs(a.time - item.time) < 3000));
        if (!exists) {
          STATE.activityLog.unshift(item);
          if (typeof renderActivity === 'function') renderActivity();
        }
      }
      if (typeof renderAdminActivities === 'function') {
        renderAdminActivities();
      }
    }
  },

  // 7. 30-DAY / MONTHLY PHOTO RETENTION AUTO-PURGE (ONLY RESETS PHOTO, ATTENDANCE RECORD IS PERMANENT!)
  async purgeOldPhotos() {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      // Monthly photo reset: photos cleared after 30 days to save storage.
      // THE ATTENDANCE RECORD (Present/Absent, Date, Hours, Employee) IS NEVER DELETED!
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await window.sbClient
        .from('attendance_logs')
        .update({ photo_url: null })
        .lt('created_at', thirtyDaysAgo)
        .not('photo_url', 'is', null);

      if (error) {
        console.warn('Auto-purge photos warning:', error.message);
      } else {
        console.log('🧹 Monthly Attendance photo reset completed. Attendance records remain permanently saved.');
      }
    } catch (e) {
      console.warn('Purge photos error:', e);
    }
  },

  // REALTIME SYNC HANDLERS
  syncProjectsRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const st = getActiveCRMState();
    if (!Array.isArray(st.projects)) st.projects = [];

    if (eventType === 'INSERT') {
      const mapped = {
        id: newRow.id,
        name: newRow.name,
        client: newRow.client,
        service: newRow.service,
        priority: newRow.priority,
        status: newRow.status,
        deadline: newRow.deadline,
        assigned: Array.isArray(newRow.assigned) ? newRow.assigned : [],
        desc: newRow.description,
        totalTimeSpent: Number(newRow.total_time_spent) || 0,
        sessions: Array.isArray(newRow.sessions) ? newRow.sessions : [],
        createdBy: newRow.created_by,
        createdAt: new Date(newRow.created_at).getTime(),
      };
      if (!st.projects.some(p => p.id === mapped.id)) {
        st.projects.unshift(mapped);
      }
    } else if (eventType === 'UPDATE') {
      const idx = st.projects.findIndex(p => p.id === newRow.id);
      if (idx !== -1) {
        st.projects[idx] = {
          ...st.projects[idx],
          name: newRow.name,
          client: newRow.client,
          service: newRow.service,
          priority: newRow.priority,
          status: newRow.status,
          deadline: newRow.deadline,
          assigned: Array.isArray(newRow.assigned) ? newRow.assigned : [],
          desc: newRow.description,
          totalTimeSpent: Number(newRow.total_time_spent) || 0,
          sessions: Array.isArray(newRow.sessions) ? newRow.sessions : [],
        };
      }
    } else if (eventType === 'DELETE') {
      st.projects = st.projects.filter(p => p.id !== oldRow.id);
    }

    persistActiveCRMState(st);
    triggerAllUIRenders();
  },

  syncClientsRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const st = getActiveCRMState();
    if (!Array.isArray(st.clients)) st.clients = [];

    if (eventType === 'INSERT') {
      const mapped = {
        id: newRow.id,
        name: newRow.name,
        industry: newRow.industry,
        status: newRow.status,
        lead: newRow.lead,
        notes: newRow.notes,
        createdAt: new Date(newRow.created_at).getTime(),
      };
      if (!st.clients.some(c => c.id === mapped.id)) {
        st.clients.unshift(mapped);
      }
    } else if (eventType === 'UPDATE') {
      const idx = st.clients.findIndex(c => c.id === newRow.id);
      if (idx !== -1) {
        st.clients[idx] = { ...st.clients[idx], ...newRow };
      }
    } else if (eventType === 'DELETE') {
      st.clients = st.clients.filter(c => c.id !== oldRow.id);
    }

    persistActiveCRMState(st);
    triggerAllUIRenders();
  },

  syncTeamRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const st = getActiveCRMState();
    if (!Array.isArray(st.team)) st.team = [];

    if (eventType === 'INSERT') {
      const mapped = {
        id: String(newRow.id || '').trim().toLowerCase(),
        name: newRow.name,
        role: newRow.role,
        shift: newRow.shift === '10:00 AM – 07:00 PM' ? '10:30 AM – 07:00 PM' : (newRow.shift || '10:30 AM – 07:00 PM'),
        password: newRow.password,
        isFounder: newRow.is_founder,
        email: newRow.email,
        phone: newRow.phone,
        domains: newRow.role ? String(newRow.role).split(',').map(s => s.trim()).filter(Boolean) : ['Video Editor'],
        addedAt: new Date(newRow.created_at).getTime(),
      };
      if (!st.team.some(m => m.id.toLowerCase() === mapped.id)) {
        st.team.push(mapped);
      }
    } else if (eventType === 'UPDATE') {
      const idx = st.team.findIndex(m => m.id.toLowerCase() === String(newRow.id || '').toLowerCase());
      if (idx !== -1) {
        st.team[idx] = {
          ...st.team[idx],
          name: newRow.name,
          role: newRow.role,
          shift: newRow.shift === '10:00 AM – 07:00 PM' ? '10:30 AM – 07:00 PM' : (newRow.shift || '10:30 AM – 07:00 PM'),
          password: newRow.password,
          lateLunchReason: newRow.late_lunch_reason,
          lateLunchTime: newRow.late_lunch_time,
          domains: newRow.role ? String(newRow.role).split(',').map(s => s.trim()).filter(Boolean) : st.team[idx].domains,
        };
      }
    } else if (eventType === 'DELETE') {
      st.team = st.team.filter(m => m.id.toLowerCase() !== String(oldRow.id || '').toLowerCase());
    }

    persistActiveCRMState(st);
    triggerAllUIRenders();
  },

  syncCalendarsRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const st = getActiveCRMState();
    if (!Array.isArray(st.calendars)) st.calendars = [];

    if (eventType === 'INSERT') {
      const mapped = {
        id: newRow.id,
        client: newRow.client,
        month: newRow.month,
        monthLabel: newRow.month_label,
        title: newRow.title,
        fileName: newRow.file_name,
        fileUrl: newRow.file_url,
        fileSize: newRow.file_size,
        uploadedBy: newRow.uploaded_by,
        notes: newRow.notes,
        uploadedAt: new Date(newRow.created_at).getTime(),
      };
      if (!st.calendars.some(c => c.id === mapped.id)) {
        st.calendars.unshift(mapped);
      }
    } else if (eventType === 'DELETE') {
      st.calendars = st.calendars.filter(c => c.id !== oldRow.id);
    }

    persistActiveCRMState(st);
    triggerAllUIRenders();
  },

  syncAttendanceRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (!Array.isArray(window._adminAttLogs)) window._adminAttLogs = [];

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const mapped = {
        ...newRow,
        photo_url: newRow.photo_url || (newRow.late_lunch_reason && String(newRow.late_lunch_reason).startsWith('photo:') ? newRow.late_lunch_reason.slice(6) : null)
      };
      const idx = window._adminAttLogs.findIndex(a => a.id === mapped.id);
      if (idx !== -1) {
        window._adminAttLogs[idx] = { ...window._adminAttLogs[idx], ...mapped };
      } else {
        window._adminAttLogs.unshift(mapped);
      }

      // Keep active session in sync if this record is for the current logged-in employee today
      try {
        const st = (typeof STATE !== 'undefined') ? STATE : window._adminState;
        if (st && st.attendance) {
          const loggedId = localStorage.getItem('da_logged_in_emp') || (st.employee && st.employee.id);
          const loggedName = (st.employee && st.employee.name) || '';
          const empNorm = loggedId ? String(loggedId).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const currentEmpName = loggedName ? loggedName.trim().toLowerCase() : '';
          const aEmpId = String(mapped.employee_id || mapped.employeeId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const aEmpName = String(mapped.employee_name || mapped.employeeName || '').trim().toLowerCase();

          if ((empNorm && aEmpId === empNorm) || (currentEmpName && aEmpName === currentEmpName)) {
            if (isTodayDate(mapped.date, mapped.check_in || mapped.created_at)) {
              const parsedCheckIn = parseSafeDate(mapped.check_in || mapped.checkIn);
              st.attendance.checkInTime = parsedCheckIn ? parsedCheckIn.getTime() : (Number(mapped.check_in) || mapped.checkIn);
              const parsedLunchStart = parseSafeDate(mapped.lunch_start);
              st.attendance.lunchStartTime = parsedLunchStart ? parsedLunchStart.getTime() : (mapped.lunch_start ? Number(mapped.lunch_start) : null);
              const parsedLunchEnd = parseSafeDate(mapped.lunch_end);
              st.attendance.lunchEndTime = parsedLunchEnd ? parsedLunchEnd.getTime() : (mapped.lunch_end ? Number(mapped.lunch_end) : null);
              const parsedCheckOut = parseSafeDate(mapped.check_out);
              st.attendance.checkOutTime = parsedCheckOut ? parsedCheckOut.getTime() : (mapped.check_out ? Number(mapped.check_out) : null);
              st.attendance.photoUrl = mapped.photo_url || null;
              st.attendance.lateLunchReason = mapped.late_lunch_reason || null;

              if (st.attendance.checkOutTime || mapped.status === 'done') {
                st.attendance.status = 'done';
              } else if ((st.attendance.lunchStartTime && !st.attendance.lunchEndTime) || mapped.status === 'lunch') {
                st.attendance.status = 'lunch';
              } else if (st.attendance.checkInTime || mapped.status === 'in') {
                st.attendance.status = 'in';
              }
              if (typeof syncAttendanceUI === 'function') syncAttendanceUI();
              if (typeof renderAttLog === 'function') renderAttLog();
              if ((st.attendance.status === 'in' || st.attendance.status === 'lunch') && typeof startAttElapsed === 'function') {
                startAttElapsed();
              }
            }
          }
        }
      } catch (rtAttErr) {}
    } else if (eventType === 'DELETE') {
      window._adminAttLogs = window._adminAttLogs.filter(a => a.id !== oldRow.id);
    }

    triggerAllUIRenders();
  },

  syncTimeRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (!Array.isArray(window._adminTimeLogs)) window._adminTimeLogs = [];
    if (eventType === 'INSERT') {
      window._adminTimeLogs.unshift(newRow);
    } else if (eventType === 'UPDATE') {
      const idx = window._adminTimeLogs.findIndex(t => t.id === newRow.id);
      if (idx !== -1) window._adminTimeLogs[idx] = newRow;
    } else if (eventType === 'DELETE') {
      window._adminTimeLogs = window._adminTimeLogs.filter(t => t.id !== oldRow.id);
    }
    triggerAllUIRenders();
  }
};

// ====================================================================
// MODAL DIALOG CONTROLS FOR SUPABASE CONFIG
// ====================================================================
function openSupabaseModal() {
  if (typeof toast === 'function') {
    toast('🟢 Supabase Cloud Database is permanently connected & active!', 'success');
  }
}

function closeSupabaseModal() {}
function saveSupabaseConfig() {}

// Global initialization - zero latency immediate cloud hydration
function initSupabaseApp() {
  SupabaseConfig.initClient();
  if (SupabaseConfig.isConfigured()) {
    SupabaseData.loadAll().then(ok => {
      if (ok) {
        if (typeof renderProjects === 'function') renderProjects();
        if (typeof renderCalendars === 'function') renderCalendars();
        if (typeof updateDashCounts === 'function') updateDashCounts();
        if (typeof syncAttendanceUI === 'function') syncAttendanceUI();
        if (typeof renderAttLog === 'function') renderAttLog();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabaseApp);
} else {
  initSupabaseApp();
}
