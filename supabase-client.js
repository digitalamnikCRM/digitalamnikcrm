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
      if (connected) {
        b.innerHTML = '<span class="sb-dot connected"></span> <span>Cloud Live</span>';
        b.className = 'supabase-status-badge connected';
        b.title = 'Supabase Cloud Database Connected & Realtime Active';
      } else {
        b.innerHTML = `<span class="sb-dot disconnected"></span> <span>Connect DB</span>`;
        b.className = 'supabase-status-badge disconnected';
        b.title = 'Click to connect your Supabase database';
      }
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
// SUPABASE DATA OPERATIONS (CRUD)
// ====================================================================
const SupabaseData = {
  // 1. Initial Load of All Real Data from Supabase
  async loadAll() {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return false;

    try {
      // 1. Fetch Clients
      const { data: clientsData, error: clientErr } = await window.sbClient
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (!clientErr && Array.isArray(clientsData)) {
        STATE.clients = clientsData.map(c => ({
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
        STATE.team = teamData.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          shift: m.shift,
          password: m.password,
          isFounder: m.is_founder,
          email: m.email,
          phone: m.phone,
          lateLunchReason: m.late_lunch_reason,
          lateLunchTime: m.late_lunch_time,
          addedAt: new Date(m.created_at).getTime(),
        }));
      }

      // 3. Fetch Deliverables / Projects
      const { data: projData, error: projErr } = await window.sbClient
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!projErr && Array.isArray(projData)) {
        STATE.projects = projData.map(p => ({
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
        STATE.calendars = calData.map(c => ({
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
        .limit(100);

      if (!attErr && Array.isArray(attData)) {
        STATE.attendance.log = attData.map(a => ({
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
          photoUrl: a.photo_url || null,
          createdAt: a.created_at,
        }));
      }

      // Background Maintenance: Auto-purge check-in photos older than 7 days
      this.purgeOldPhotos();

      console.log('📦 Data successfully hydrated from Supabase Cloud!');
      save(); // update local fallback
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
        id: m.id,
        name: m.name,
        role: m.role,
        shift: m.shift || '10:00 AM – 07:00 PM',
        password: m.password || '123',
        is_founder: Boolean(m.isFounder),
        email: m.email || '',
        phone: m.phone || '',
        late_lunch_reason: m.lateLunchReason || null,
        late_lunch_time: m.lateLunchTime || null,
        created_at: new Date(m.addedAt || Date.now()).toISOString(),
      };
      const { error } = await window.sbClient.from('team_members').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase upsertTeamMember error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  async deleteTeamMember(id) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const { error } = await window.sbClient.from('team_members').delete().eq('id', id);
      if (error) console.error('Supabase deleteTeamMember error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  // 5. CALENDAR OPERATIONS
  async upsertCalendar(cal) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const row = {
        id: cal.id,
        client: cal.client,
        month: cal.month,
        month_label: cal.monthLabel,
        title: cal.title,
        file_name: cal.fileName,
        file_url: cal.fileUrl,
        file_size: cal.fileSize || '',
        uploaded_by: cal.uploadedBy || (STATE.employee && STATE.employee.name) || 'Admin',
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

  // 6. ATTENDANCE LOG OPERATIONS
  async logAttendance(entry) {
    if (!SupabaseConfig.isConfigured() || !window.sbClient) return;
    try {
      const row = {
        id: entry.id || ('att-' + Date.now().toString(36)),
        employee_id: entry.employeeId || (STATE.employee && STATE.employee.id),
        employee_name: entry.employeeName || (STATE.employee && STATE.employee.name),
        date: entry.date,
        check_in: entry.checkIn || null,
        lunch_start: entry.lunchStart || null,
        lunch_end: entry.lunchEnd || null,
        check_out: entry.checkOut || null,
        effective_hours: entry.effectiveHours || '0h 0m',
        late_lunch_reason: entry.lateLunchReason || null,
        status: entry.status || 'done',
        photo_url: entry.photoUrl || entry.photo_url || null,
        created_at: new Date().toISOString(),
      };
      const { error } = await window.sbClient.from('attendance_logs').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase logAttendance error:', error);
    } catch (e) {
      console.error(e);
    }
  },

  // 7. 7-DAY PHOTO RETENTION AUTO-PURGE
  // Automatically clears heavy photos older than 7 days, keeping the 'Present' attendance records permanent
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
      if (!STATE.projects.some(p => p.id === mapped.id)) {
        STATE.projects.unshift(mapped);
      }
    } else if (eventType === 'UPDATE') {
      const idx = STATE.projects.findIndex(p => p.id === newRow.id);
      if (idx !== -1) {
        STATE.projects[idx] = {
          ...STATE.projects[idx],
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
      STATE.projects = STATE.projects.filter(p => p.id !== oldRow.id);
    }

    if (typeof renderProjects === 'function') renderProjects();
    if (typeof updateDashCounts === 'function') updateDashCounts();
    if (typeof updateAdminKpis === 'function') updateAdminKpis();
    if (typeof renderAdminProjectsTime === 'function') renderAdminProjectsTime();
    save();
  },

  syncClientsRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
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
      if (!STATE.clients.some(c => c.id === mapped.id)) {
        STATE.clients.unshift(mapped);
      }
    } else if (eventType === 'UPDATE') {
      const idx = STATE.clients.findIndex(c => c.id === newRow.id);
      if (idx !== -1) {
        STATE.clients[idx] = { ...STATE.clients[idx], ...newRow };
      }
    } else if (eventType === 'DELETE') {
      STATE.clients = STATE.clients.filter(c => c.id !== oldRow.id);
    }

    if (typeof renderClientsDatalist === 'function') renderClientsDatalist();
    if (typeof renderAdminClients === 'function') renderAdminClients();
    if (typeof updateAdminKpis === 'function') updateAdminKpis();
    save();
  },

  syncTeamRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT') {
      const mapped = {
        id: newRow.id,
        name: newRow.name,
        role: newRow.role,
        shift: newRow.shift,
        password: newRow.password,
        isFounder: newRow.is_founder,
        email: newRow.email,
        phone: newRow.phone,
        addedAt: new Date(newRow.created_at).getTime(),
      };
      if (!STATE.team.some(m => m.id === mapped.id)) {
        STATE.team.push(mapped);
      }
    } else if (eventType === 'UPDATE') {
      const idx = STATE.team.findIndex(m => m.id === newRow.id);
      if (idx !== -1) {
        STATE.team[idx] = {
          ...STATE.team[idx],
          name: newRow.name,
          role: newRow.role,
          shift: newRow.shift,
          password: newRow.password,
          lateLunchReason: newRow.late_lunch_reason,
          lateLunchTime: newRow.late_lunch_time,
        };
      }
    } else if (eventType === 'DELETE') {
      STATE.team = STATE.team.filter(m => m.id !== oldRow.id);
    }

    if (typeof renderAdminEmployees === 'function') renderAdminEmployees();
    if (typeof updateAdminKpis === 'function') updateAdminKpis();
    save();
  },

  syncCalendarsRealtime(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
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
      if (!STATE.calendars.some(c => c.id === mapped.id)) {
        STATE.calendars.unshift(mapped);
      }
    } else if (eventType === 'DELETE') {
      STATE.calendars = STATE.calendars.filter(c => c.id !== oldRow.id);
    }

    if (typeof renderCalendars === 'function') renderCalendars();
    if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
    if (typeof renderAdminClients === 'function') renderAdminClients();
    if (typeof updateAdminKpis === 'function') updateAdminKpis();
    if (typeof save === 'function') save();
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
