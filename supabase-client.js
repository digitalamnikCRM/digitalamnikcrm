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
  if (typeof renderAdminClients === 'function') renderAdminClients();
  if (typeof renderAdminEmployees === 'function') renderAdminEmployees();
  if (typeof renderAdminProjectsTime === 'function') renderAdminProjectsTime();
  if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
  if (typeof renderAdminAttendanceTable === 'function') renderAdminAttendanceTable();
  if (typeof updateAdminKpis === 'function') updateAdminKpis();
  if (typeof renderLiveWorkAndCompletions === 'function') renderLiveWorkAndCompletions();
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
          shift: m.shift || '10:00 AM – 07:00 PM',
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

      // 5. Fetch Attendance Logs
      const { data: attData, error: attErr } = await window.sbClient
        .from('attendance_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (!attErr && Array.isArray(attData)) {
        window._adminAttLogs = attData.map(a => ({
          ...a,
          photo_url: a.photo_url || (a.late_lunch_reason && String(a.late_lunch_reason).startsWith('photo:') ? a.late_lunch_reason.slice(6) : null)
        }));
        if (!st.attendance) st.attendance = { status: 'out' };
        st.attendance.log = attData.map(a => {
          const photo = a.photo_url || (a.late_lunch_reason && String(a.late_lunch_reason).startsWith('photo:') ? a.late_lunch_reason.slice(6) : null);
          return {
            id: a.id,
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            date: a.date,
            checkIn: a.check_in,
            lunchStart: a.lunch_start,
            lunchEnd: a.lunch_end,
            checkOut: a.check_out,
            effectiveHours: a.effective_hours,
            lateLunchReason: (a.late_lunch_reason && String(a.late_lunch_reason).startsWith('photo:')) ? null : a.late_lunch_reason,
            status: a.status,
            photoUrl: photo,
            createdAt: a.created_at,
          };
        });
      }

      // Background Maintenance: Auto-purge check-in photos older than 7 days
      this.purgeOldPhotos();

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
        created_by: proj.createdBy || (STATE.employee && STATE.employee.name) || 'Admin',
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
        shift: m.shift || '10:00 AM – 07:00 PM',
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
      const rawDate = String(entry.date || '').trim();
      const sanitizedDate = rawDate.replace(/[^a-zA-Z0-9]/g, '_');
      const deterministicId = entry.id || `att_${rawEmpId.replace(/[^a-z0-9]/g, '')}_${sanitizedDate}`;
      const photo = entry.photoUrl || entry.photo_url || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.photoUrl) ? STATE.attendance.photoUrl : null);
      const rawCheckIn = typeof entry.checkIn === 'number' ? entry.checkIn : (typeof entry.check_in === 'number' ? entry.check_in : ((typeof STATE !== 'undefined' && STATE.attendance && typeof STATE.attendance.checkInTime === 'number') ? STATE.attendance.checkInTime : Date.now()));
      const rawLunchStart = entry.lunchStart || entry.lunch_start || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.lunchStartTime) ? STATE.attendance.lunchStartTime : null);
      const rawLunchEnd = entry.lunchEnd || entry.lunch_end || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.lunchEndTime) ? STATE.attendance.lunchEndTime : null);
      const rawCheckOut = entry.checkOut || entry.check_out || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.checkOutTime) ? STATE.attendance.checkOutTime : null);
      const rawStatus = entry.status || ((typeof STATE !== 'undefined' && STATE.attendance && STATE.attendance.status) ? STATE.attendance.status : (rawLunchStart && !rawLunchEnd ? 'lunch' : 'in'));

      const row = {
        id: deterministicId,
        employee_id: rawEmpId,
        employee_name: entry.employeeName || entry.employee_name || currentEmpName,
        date: rawDate,
        check_in: rawCheckIn,
        lunch_start: rawLunchStart,
        lunch_end: rawLunchEnd,
        check_out: rawCheckOut,
        effective_hours: entry.effectiveHours || entry.effective_hours || '0h 0m',
        late_lunch_reason: photo ? `photo:${photo}` : (entry.lateLunchReason || entry.late_lunch_reason || null),
        status: rawStatus,
        created_at: new Date().toISOString(),
      };
      const { data: upsertedRow, error } = await window.sbClient.from('attendance_logs').upsert(row, { onConflict: 'id' }).select();
      if (error) {
        console.error('Supabase logAttendance error:', error);
      } else {
        console.log('✅ Attendance successfully logged to Supabase Cloud for:', rawEmpId);
        if (Array.isArray(window._adminAttLogs)) {
          const idx = window._adminAttLogs.findIndex(a => a.id === deterministicId || ((a.employee_id || a.employeeId) === rawEmpId && a.date === rawDate));
          const updatedEntry = {
            ...row,
            photo_url: photo
          };
          if (idx !== -1) {
            window._adminAttLogs[idx] = { ...window._adminAttLogs[idx], ...updatedEntry };
          } else {
            window._adminAttLogs.unshift(updatedEntry);
          }
        }
      }
    } catch (e) {
      console.error('logAttendance exception:', e);
    }
  },

  // 7. 7-DAY PHOTO RETENTION AUTO-PURGE
  async purgeOldPhotos() {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await window.sbClient
        .from('attendance_logs')
        .update({ photo_url: null })
        .lt('created_at', sevenDaysAgo)
        .not('photo_url', 'is', null);

      if (error) {
        console.warn('Auto-purge photos warning:', error.message);
      } else {
        console.log('🧹 7-Day Attendance photo hygiene check completed.');
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
        shift: newRow.shift || '10:00 AM – 07:00 PM',
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
          shift: newRow.shift || '10:00 AM – 07:00 PM',
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
    } else if (eventType === 'DELETE') {
      window._adminAttLogs = window._adminAttLogs.filter(a => a.id !== oldRow.id);
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

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  SupabaseConfig.initClient();
  setTimeout(() => {
    if (SupabaseConfig.isConfigured()) {
      SupabaseData.loadAll().then(ok => {
        if (ok) {
          if (typeof renderProjects === 'function') renderProjects();
          if (typeof renderCalendars === 'function') renderCalendars();
          if (typeof updateDashCounts === 'function') updateDashCounts();
        }
      });
    }
  }, 300);
});
