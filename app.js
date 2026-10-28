/* =========================================================
   DIGITAL AMNIK CRM — AGENCY OPERATING SYSTEM & CRM
   Digital Amnik Agency Workspace
   ========================================================= */

// ========================
// DOMAIN ROLES
// ========================
const DOMAIN_ROLES = [
  { label: 'Video Editor', icon: '🎬', isManager: false, desc: 'Reels, YouTube, Long & Short form edits' },
  { label: 'Social Media Management', icon: '📱', isManager: true, desc: 'Strategy, client campaigns & project delegation' },
  { label: 'Graphic Design', icon: '🎨', isManager: false, desc: 'Thumbnails, banners, social posts' },
  { label: 'Paid Ads Specialist', icon: '💰', isManager: false, desc: 'Meta Ads, Google PPC campaigns, ROAS' },
  { label: 'SEO Specialist', icon: '🔍', isManager: false, desc: 'Search rankings, keywords, audit reports' },
  { label: 'Content Creator / Writer', icon: '✍️', isManager: false, desc: 'Scripts, captions, creative copy' },
  { label: 'Web Developer', icon: '💻', isManager: false, desc: 'Landing pages, web applications, tech' },
  { label: 'Admin', icon: '🗂️', isManager: true, desc: 'Operations, client assignments & tasks' },
];

// ========================
// DELIVERABLES INITIAL SEED
// ========================
const DEFAULT_PROJECTS = [];

// ========================
// ADMIN CLIENTS INITIAL SEED (CLEAN - REAL DATA)
// ========================
const DEFAULT_CLIENTS = [];

// ========================
// ADMIN TEAM & ROSTER INITIAL SEED (REAL FOUNDER ONLY)
// ========================
const DEFAULT_TEAM = [
  {
    id: 'EMP-000',
    name: 'Amaan Khan',
    role: 'Admin',
    shift: '09:30 AM – 07:30 PM',
    password: 'amnik2026',
    isFounder: true,
    addedAt: Date.now(),
  },
];

// ========================
// STATE MANAGEMENT
// ========================
const STATE = window.STATE = {
  employee: {
    name: 'Amaan Khan',
    id: 'EMP-000',
    role: 'Admin',
    icon: '🗂️',
    initials: 'AK',
  },
  attendance: {
    status: 'out', // out | in | lunch | done
    checkInTime: null,
    lunchStartTime: null,
    lunchEndTime: null,
    checkOutTime: null,
    lateLunchReason: null,
    elapsedInterval: null,
    log: [],
  },
  activeProjectTimer: null,
  projects: [],
  calendars: [],
  clients: [],
  team: [],
  timeLogs: [],
  activityLog: [],
  currentFilter: 'all',
  editingProjectId: null,
  viewingProjectId: null,
  audioPlaying: false,
};

let _selectedOnboardRole = 'Video Editor';
let _selectedEditRole = 'Video Editor';
let _audioCtx = null;
let _audioNode = null;

// ========================
// FORMATTERS & UTILITIES
// ========================
function fmt(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isSameCalendarDay(t1, t2) {
  if (!t1) return false;
  const d1 = new Date(t1);
  const d2 = new Date(t2 || Date.now());
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtHHMMSS(ms) {
  if (!ms || ms < 0) ms = 0;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600).toString().padStart(2, '0');
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
  const s = (t % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function computeInitials(name) {
  if (!name) return 'DA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function isManagerRole(roleName) {
  const emp = STATE.employee || {};
  if (emp.isFounder || emp.id === 'EMP-000') return true;
  const r = (roleName || emp.role || '').toLowerCase();
  const domains = Array.isArray(emp.domains)
    ? emp.domains.map(d => String(d).trim().toLowerCase())
    : (emp.role ? String(emp.role).split(',').map(s => s.trim().toLowerCase()) : []);
  const hasSMM = domains.some(d => d.includes('social media'));
  const hasOwnerOrAdmin = domains.some(d => d.includes('admin') || d.includes('founder') || d.includes('owner'));
  return r.includes('social media') || r.includes('admin') || r.includes('founder') || r.includes('owner') || hasSMM || hasOwnerOrAdmin;
}

function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function addActivity(text, color = 'purple') {
  const now = Date.now();
  const todayDateStr = fmtDate(now);
  const empName = (STATE.employee && STATE.employee.name) ? STATE.employee.name : 'Specialist';

  // Format text with user name for agency-wide clarity if needed
  let fullText = text;
  if (!fullText.toLowerCase().includes(empName.toLowerCase()) && !fullText.startsWith('System') && !fullText.startsWith('Team member')) {
    fullText = `[${empName}] ${text}`;
  }

  const actItem = {
    id: 'act_' + now + '_' + Math.random().toString(36).substr(2, 5),
    text: fullText,
    color: color,
    time: now,
    date: todayDateStr,
    employeeId: STATE.employee?.id || 'emp',
    employeeName: empName
  };

  if (!STATE.activityLog) STATE.activityLog = [];
  STATE.activityLog.unshift(actItem);
  if (STATE.activityLog.length > 50) STATE.activityLog.pop();

  renderActivity();
  save();

  // Sync to Supabase Cloud Backend!
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.logActivity(actItem);
  }
}

// ========================
// PERSISTENCE (LocalStorage)
// ========================
function save() {
  const toSave = {
    employee: STATE.employee,
    projects: STATE.projects,
    calendars: STATE.calendars,
    clients: STATE.clients,
    team: STATE.team,
    timeLogs: STATE.timeLogs,
    activityLog: STATE.activityLog,
    activeProjectTimer: STATE.activeProjectTimer ? {
      projectId: STATE.activeProjectTimer.projectId,
      startTime: STATE.activeProjectTimer.startTime,
    } : null,
    attendance: {
      status: STATE.attendance.status,
      checkInTime: STATE.attendance.checkInTime,
      lunchStartTime: STATE.attendance.lunchStartTime,
      lunchEndTime: STATE.attendance.lunchEndTime,
      checkOutTime: STATE.attendance.checkOutTime,
      lateLunchReason: STATE.attendance.lateLunchReason,
      log: STATE.attendance.log,
    },
  };
  localStorage.setItem('da_crm_state_v3', JSON.stringify(toSave));
  try {
    const curEmpId = String(STATE.employee?.id || 'emp').toLowerCase().replace(/[^a-z0-9]/g, '');
    const curDate = fmtDate(Date.now());
    localStorage.setItem(`da_att_${curEmpId}_${curDate}`, JSON.stringify(STATE.attendance));
    if (STATE.activeProjectTimer && STATE.activeProjectTimer.projectId) {
      localStorage.setItem(`da_active_timer_${curEmpId}`, JSON.stringify(STATE.activeProjectTimer));
    } else {
      localStorage.removeItem(`da_active_timer_${curEmpId}`);
    }
  } catch (e) {}
}

function load() {
  const raw = localStorage.getItem('da_crm_state_v3') || localStorage.getItem('da_crm_state_v2');
  if (!raw) {
    STATE.projects = [];
    STATE.calendars = [];
    STATE.clients = [];
    STATE.team = JSON.parse(JSON.stringify(DEFAULT_TEAM));
    return;
  }
  try {
    const data = JSON.parse(raw);
    
    // Clean Real Clients (Strip any legacy mock clients)
    if (Array.isArray(data.clients)) {
      STATE.clients = data.clients.filter(c =>
        c && c.id !== 'c-1' && c.id !== 'c-2' && c.id !== 'c-3' && c.id !== 'c-4' &&
        !/nike|luxe living|amnik tech/i.test(c.name || '')
      );
    } else {
      STATE.clients = [];
    }

    // Clean Real Team (Only registered real members, keep Founder Amaan Khan)
    if (Array.isArray(data.team)) {
      STATE.team = data.team.filter(m =>
        m && m.id === 'EMP-000' ||
        (!['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'].includes(m.id) &&
         !/team member|sarah jenkins|rohit sharma|priya patel|kabir verma|neha gupta/i.test(m.name || ''))
      );
      if (!STATE.team.some(m => m.id === 'EMP-000')) {
        STATE.team.unshift(DEFAULT_TEAM[0]);
      }
    } else {
      STATE.team = JSON.parse(JSON.stringify(DEFAULT_TEAM));
    }

    // Ensure all team members have a password
    STATE.team.forEach(m => {
      if (!m.password) {
        m.password = m.isFounder ? 'amnik2026' : '123';
      }
    });

    // Check logged in employee session
    const loggedInId = localStorage.getItem('da_logged_in_emp') || 'EMP-000';
    let member = STATE.team.find(m => m.id.toLowerCase() === loggedInId.toLowerCase());
    if (!member) member = STATE.team[0];
    if (member) {
      const empIdNorm = String(member.id || '').trim().toLowerCase();
      const savedAvatar = member.avatar || member.photoUrl || localStorage.getItem('da_emp_avatar_' + empIdNorm);
      const roleObj = DOMAIN_ROLES.find(r => r.label === member.role);
      STATE.employee = {
        name: member.name,
        id: member.id,
        role: member.role,
        icon: roleObj ? roleObj.icon : '🗂️',
        initials: computeInitials(member.name),
        avatar: savedAvatar || null,
        photoUrl: savedAvatar || null,
      };
      STATE.team.forEach(m => {
        m.isCurrent = (m.id.toLowerCase() === member.id.toLowerCase());
      });
    }

    if (Array.isArray(data.projects)) {
      // Filter out legacy mock/sample projects
      STATE.projects = data.projects.filter(p =>
        p && p.id !== 'p-1' && p.id !== 'p-2' && p.id !== 'p-3' &&
        p.id !== 'mvm1nuia2euxf' &&
        !/automated growth campaign|growth campaign|techvibe|luxe/i.test((p.name || '') + ' ' + (p.client || ''))
      );
    } else {
      STATE.projects = [];
    }

    // Clean Real Calendars (No fake mock sample PDF)
    if (Array.isArray(data.calendars)) {
      STATE.calendars = data.calendars.filter(c => c && c.id !== 'cal-sample-1');
    } else {
      STATE.calendars = [];
    }

    if (Array.isArray(data.timeLogs)) {
      STATE.timeLogs = data.timeLogs.filter(l => l && l.projectId !== 'p-1' && l.projectId !== 'p-2' && l.projectId !== 'p-3');
    } else {
      STATE.timeLogs = [];
    }

    if (Array.isArray(data.activityLog)) {
      STATE.activityLog = data.activityLog.filter(a => a && !/tech brand|ilhan/i.test(a.text || ''));
    } else {
      STATE.activityLog = [];
    }

    if (data.activeProjectTimer && data.activeProjectTimer.projectId && (Date.now() - (data.activeProjectTimer.startTime || 0) < 24 * 3600 * 1000)) {
      STATE.activeProjectTimer = {
        projectId: data.activeProjectTimer.projectId,
        startTime: data.activeProjectTimer.startTime,
      };
    } else {
      STATE.activeProjectTimer = null;
    }

    // Check dedicated active timer backup key for current employee
    try {
      const activeEmpId = String(localStorage.getItem('da_logged_in_emp') || (STATE.employee && STATE.employee.id) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (activeEmpId) {
        const savedTimer = localStorage.getItem(`da_active_timer_${activeEmpId}`);
        if (savedTimer) {
          const parsed = JSON.parse(savedTimer);
          if (parsed && parsed.projectId && (Date.now() - (Number(parsed.startTime) || 0) < 24 * 3600 * 1000)) {
            STATE.activeProjectTimer = parsed;
          }
        }
      }
    } catch (e) {}

    if (data.attendance) {
      STATE.attendance.status = data.attendance.status || 'out';
      STATE.attendance.checkInTime = data.attendance.checkInTime;
      STATE.attendance.lunchStartTime = data.attendance.lunchStartTime;
      STATE.attendance.lunchEndTime = data.attendance.lunchEndTime;
      STATE.attendance.checkOutTime = data.attendance.checkOutTime;
      STATE.attendance.lateLunchReason = data.attendance.lateLunchReason || null;
      STATE.attendance.log = data.attendance.log || [];
    }

    // Restore dedicated employee attendance for today if saved
    try {
      const activeEmpId = String(localStorage.getItem('da_logged_in_emp') || STATE.employee?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const curDateStr = fmtDate(Date.now());
      const savedEmpAtt = localStorage.getItem(`da_att_${activeEmpId}_${curDateStr}`);
      if (savedEmpAtt) {
        const parsedAtt = JSON.parse(savedEmpAtt);
        if (parsedAtt && (parsedAtt.checkInTime || parsedAtt.status === 'in' || parsedAtt.status === 'lunch')) {
          STATE.attendance.status = parsedAtt.status;
          STATE.attendance.checkInTime = parsedAtt.checkInTime;
          STATE.attendance.lunchStartTime = parsedAtt.lunchStartTime;
          STATE.attendance.lunchEndTime = parsedAtt.lunchEndTime;
          STATE.attendance.checkOutTime = parsedAtt.checkOutTime;
          STATE.attendance.lateLunchReason = parsedAtt.lateLunchReason || null;
        }
      }
    } catch (e) {}

    // Verify restored attendance belongs strictly to TODAY
    const isTodaySession = STATE.attendance.checkInTime && isSameCalendarDay(STATE.attendance.checkInTime, Date.now());
    if (STATE.attendance.checkInTime && !isTodaySession) {
      console.log('🌅 New calendar day detected in load()! Archiving past session and resetting active attendance.');
      const prevDateStr = fmtDate(STATE.attendance.checkInTime);
      if (!STATE.attendance.log) STATE.attendance.log = [];
      const alreadyLogged = STATE.attendance.log.some(l => l.date === prevDateStr && (l.employeeId === STATE.employee?.id || l.employee_id === STATE.employee?.id));
      if (!alreadyLogged) {
        STATE.attendance.log.unshift({
          date: prevDateStr,
          employeeId: STATE.employee?.id,
          employeeName: STATE.employee?.name,
          checkIn: fmt(STATE.attendance.checkInTime),
          checkOut: STATE.attendance.checkOutTime ? fmt(STATE.attendance.checkOutTime) : '--:--',
          lunch: 'None',
          workHrs: 'Completed',
          status: 'done'
        });
      }
      STATE.attendance.status = 'out';
      STATE.attendance.checkInTime = null;
      STATE.attendance.lunchStartTime = null;
      STATE.attendance.lunchEndTime = null;
      STATE.attendance.checkOutTime = null;
      STATE.attendance.photoUrl = null;
      STATE.attendance.lateLunchReason = null;
    }
  } catch (e) {
    console.warn('Storage parse error, resetting clean:', e);
    STATE.projects = [];
    STATE.clients = [];
    STATE.calendars = [];
    STATE.team = JSON.parse(JSON.stringify(DEFAULT_TEAM));
  }
  // Immediately persist cleaned state so stale projects don't linger
  save();
}

// ========================
// PROFILE & DOMAIN SYNCHRONIZATION
// ========================
function syncProfileUI() {
  const emp = STATE.employee;
  emp.initials = computeInitials(emp.name);

  const domains = Array.isArray(emp.domains) && emp.domains.length > 0
    ? emp.domains
    : (emp.role ? String(emp.role).split(',').map(s => s.trim()).filter(Boolean) : ['Video Editor']);

  const primaryDomain = domains[0] || emp.role || 'Video Editor';
  const roleObj = DOMAIN_ROLES.find(r => r.label.toLowerCase() === primaryDomain.toLowerCase()) || { icon: '🎬' };
  emp.icon = roleObj.icon;

  // Sidebar
  const empIdNorm = String(emp.id || '').trim().toLowerCase();
  const avatarSrc = emp.avatar || emp.photoUrl || localStorage.getItem('da_emp_avatar_' + empIdNorm);
  const avatarEl = document.getElementById('sidebar-avatar');
  if (avatarEl) {
    if (avatarSrc) {
      avatarEl.innerHTML = `<img src="${avatarSrc}" alt="${emp.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`;
    } else {
      avatarEl.textContent = emp.initials || computeInitials(emp.name || 'DA');
    }
  }

  const nameEl = document.getElementById('sidebar-name');
  if (nameEl) nameEl.textContent = emp.name;



  const idEl = document.getElementById('sidebar-id');
  if (idEl) idEl.textContent = emp.id;

  const roleIconEl = document.getElementById('sidebar-role-icon');
  const roleLabelEl = document.getElementById('sidebar-role-label');
  const oldTag = document.getElementById('sidebar-role-tag');

  // Render multiple domain pills in sidebar if assigned more than 1 domain
  const roleRow = document.querySelector('.emp-role-row');
  if (roleRow) {
    let wrap = roleRow.querySelector('.emp-roles-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'emp-roles-wrap';
      roleRow.appendChild(wrap);
    }
    if (domains.length > 1) {
      wrap.innerHTML = domains.map(d => {
        const obj = DOMAIN_ROLES.find(r => r.label.toLowerCase() === d.toLowerCase()) || { icon: '💼' };
        return `<span class="emp-role-tag-pill">${obj.icon} ${d}</span>`;
      }).join('');
      wrap.style.display = 'flex';
      if (oldTag) oldTag.style.display = 'none';
    } else {
      wrap.style.display = 'none';
      if (oldTag) oldTag.style.display = 'inline-flex';
      if (roleIconEl) roleIconEl.textContent = emp.icon || '🎬';
      if (roleLabelEl) roleLabelEl.textContent = domains[0] || emp.role;
    }
  }

  // Welcome banner in Dashboard
  const welcomeName = document.getElementById('welcome-name');
  if (welcomeName) welcomeName.textContent = emp.name;

  const welcomeBadge = document.getElementById('welcome-role-badge');
  if (welcomeBadge) {
    if (domains.length > 1) {
      welcomeBadge.textContent = domains.map(d => {
        const obj = DOMAIN_ROLES.find(r => r.label.toLowerCase() === d.toLowerCase()) || { icon: '💼' };
        return `${obj.icon} ${d}`;
      }).join(' • ');
    } else {
      welcomeBadge.textContent = `${emp.icon || '🎬'} ${emp.role}`;
    }
  }

  // Stat card "My Role"
  const dashRoleVal = document.getElementById('dash-role-val');
  if (dashRoleVal) dashRoleVal.textContent = domains.join(', ') || emp.role;

  const dashRoleBadge = document.getElementById('dash-role-badge');
  if (dashRoleBadge) {
    if (isManagerRole()) {
      dashRoleBadge.textContent = '👑 Manager / Owner Access';
      dashRoleBadge.className = 'stat-badge green';
    } else {
      dashRoleBadge.textContent = `${domains.length} Domain(s)`;
      dashRoleBadge.className = 'stat-badge orange';
    }
  }

  // Ensure '+ New Deliverable' button is visible to all specialists
  const newDelivBtn = document.querySelector('#section-projects .section-header .btn-primary');
  if (newDelivBtn) {
    newDelivBtn.style.display = 'inline-flex';
  }

  // Role notice in Projects section
  renderRoleNotice();

  // Sync current member in team roster
  if (Array.isArray(STATE.team)) {
    const curr = STATE.team.find(m => m.id === emp.id || m.isCurrent);
    if (curr) {
      curr.name = emp.name;
      curr.role = emp.role;
      curr.id = emp.id;
      curr.isCurrent = true;
    }
  }
}

// ========================
// EMPLOYEE PROFILE CONTROLLER
// ========================
let _pendingProfilePic = undefined;

function triggerEmployeeProfileUpload() {
  const fileInput = document.getElementById('emp-profile-pic-file');
  if (fileInput) fileInput.click();
}

function handleEmployeeAvatarChange(e) {
  const file = e && e.target && e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast('Please select an image file (PNG, JPG, WebP)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const rawData = evt.target.result;
    const img = new Image();
    img.onload = function() {
      const maxDim = 220;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

      _pendingProfilePic = compressedDataUrl;

      // Update modal preview immediately
      const imgPreview = document.getElementById('emp-profile-img-preview');
      const textPreview = document.getElementById('emp-profile-avatar-preview');
      const removeBtn = document.getElementById('btn-remove-emp-avatar');
      if (imgPreview) {
        imgPreview.src = compressedDataUrl;
        imgPreview.style.display = 'block';
      }
      if (textPreview) textPreview.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
}

function removeEmployeeAvatar() {
  _pendingProfilePic = '';
  const imgPreview = document.getElementById('emp-profile-img-preview');
  const textPreview = document.getElementById('emp-profile-avatar-preview');
  const removeBtn = document.getElementById('btn-remove-emp-avatar');
  const fileInput = document.getElementById('emp-profile-pic-file');

  if (fileInput) fileInput.value = '';
  if (imgPreview) {
    imgPreview.src = '';
    imgPreview.style.display = 'none';
  }
  if (textPreview) {
    textPreview.textContent = computeInitials(STATE.employee.name || 'DA');
    textPreview.style.display = 'inline-block';
  }
  if (removeBtn) removeBtn.style.display = 'none';
}

function openEmployeeProfileModal() {
  const emp = (typeof STATE !== 'undefined' && STATE && STATE.employee) 
    ? STATE.employee 
    : { id: 'emp001', name: 'Team Member', role: 'Video Editor' };
  const nameInput = document.getElementById('emp-profile-name-input');
  const roleInput = document.getElementById('emp-profile-role-input');
  const previewName = document.getElementById('emp-profile-preview-name');
  const previewId = document.getElementById('emp-profile-preview-id');
  const imgPreview = document.getElementById('emp-profile-img-preview');
  const textPreview = document.getElementById('emp-profile-avatar-preview');
  const removeBtn = document.getElementById('btn-remove-emp-avatar');
  const fileInput = document.getElementById('emp-profile-pic-file');

  if (fileInput) fileInput.value = '';
  _pendingProfilePic = undefined;

  const rawId = String(emp.id || 'emp001').trim();
  const cleanId = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const currentAvatar = emp.avatar || emp.photoUrl || localStorage.getItem('da_emp_avatar_' + cleanId) || localStorage.getItem('da_emp_avatar_' + rawId.toLowerCase());

  if (nameInput) nameInput.value = emp.name || '';
  if (roleInput) {
    const isFounderEmp = Boolean(emp.isFounder || String(emp.id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'emp000');
    const adminOpt = roleInput.querySelector('option[value="Admin"]');
    if (adminOpt && !isFounderEmp) {
      adminOpt.remove();
    }
    roleInput.value = emp.role || 'Video Editor';
    if (!roleInput.value) {
      for (let i = 0; i < roleInput.options.length; i++) {
        if (roleInput.options[i].value.toLowerCase().includes(String(emp.role || '').toLowerCase())) {
          roleInput.selectedIndex = i;
          break;
        }
      }
    }
  }
  if (previewName) previewName.textContent = emp.name || 'Team Member';
  if (previewId) previewId.textContent = emp.id || 'emp001';

  if (currentAvatar) {
    if (imgPreview) {
      imgPreview.src = currentAvatar;
      imgPreview.style.display = 'block';
    }
    if (textPreview) textPreview.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    if (imgPreview) {
      imgPreview.src = '';
      imgPreview.style.display = 'none';
    }
    if (textPreview) {
      textPreview.textContent = computeInitials(emp.name || 'DA');
      textPreview.style.display = 'inline-block';
    }
    if (removeBtn) removeBtn.style.display = 'none';
  }

  openModal('employee-profile-modal');
}

async function saveEmployeeProfile() {
  const nameInput = document.getElementById('emp-profile-name-input');
  const roleInput = document.getElementById('emp-profile-role-input');
  const newName = nameInput ? nameInput.value.trim() : '';
  const newRole = roleInput ? roleInput.value.trim() : '';

  const isFounderEmpSave = Boolean(STATE.employee && (STATE.employee.isFounder || String(STATE.employee.id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'emp000'));
  if (newRole && newRole.toLowerCase().includes('admin') && !isFounderEmpSave) {
    toast('⛔ Security Alert: Staff members cannot self-assign Admin privileges! Only Founder Amaan Khan has Admin rights.', 'error');
    return;
  }

  if (!newName) {
    toast('Please enter your full name', 'error');
    return;
  }

  if (!STATE.employee) {
    STATE.employee = { id: 'emp001', name: newName, role: newRole || 'Video Editor' };
  }

  const rawId = String(STATE.employee.id || 'emp001').trim();
  const cleanId = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  STATE.employee.name = newName;
  if (newRole) {
    STATE.employee.role = newRole;
    STATE.employee.domains = [newRole];
  }
  STATE.employee.initials = computeInitials(newName);

  // Handle avatar update
  if (_pendingProfilePic !== undefined) {
    if (_pendingProfilePic) {
      STATE.employee.avatar = _pendingProfilePic;
      STATE.employee.photoUrl = _pendingProfilePic;
      try {
        localStorage.setItem('da_emp_avatar_' + cleanId, _pendingProfilePic);
        localStorage.setItem('da_emp_avatar_' + rawId.toLowerCase(), _pendingProfilePic);
      } catch (e) {
        console.warn('localStorage avatar save note:', e);
      }
    } else {
      delete STATE.employee.avatar;
      delete STATE.employee.photoUrl;
      try {
        localStorage.removeItem('da_emp_avatar_' + cleanId);
        localStorage.removeItem('da_emp_avatar_' + rawId.toLowerCase());
      } catch (e) {}
    }
  }

  // Update in STATE.team
  let memberObj = null;
  if (Array.isArray(STATE.team)) {
    let member = STATE.team.find(m => {
      const mClean = String(m.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return mClean === cleanId || m.name === newName || m.isCurrent;
    });
    if (!member && STATE.team.length > 0) member = STATE.team[0];
    if (member) {
      member.name = newName;
      if (newRole) {
        member.role = newRole;
        member.domains = [newRole];
      }
      if (STATE.employee.avatar) member.avatar = STATE.employee.avatar;
      else delete member.avatar;
      memberObj = member;
    }
  }

  save();
  try {
    localStorage.setItem('da_crm_emp_name', newName);
    localStorage.setItem('da_crm_emp_role', newRole);
  } catch (e) {}

  if (typeof saveCRMState === 'function') {
    try { saveCRMState(STATE); } catch (e) {}
  }
  syncProfileUI();
  updateDashCounts();
  closeModal('employee-profile-modal');
  toast('Specialist profile updated! ✨', 'success');
  addActivity(`Updated profile details for ${newName}`, 'purple');

  // Sync to Supabase team_members table using both cleanId (e.g. emp001) and rawId (e.g. EMP-001)
  try {
    if (window.sbClient && typeof window.sbClient.from === 'function') {
      const updateData = { name: newName, role: newRole };
      if (_pendingProfilePic !== undefined) {
        updateData.photo_url = _pendingProfilePic || null;
      }
      
      // Update by cleanId
      let res = await window.sbClient
        .from('team_members')
        .update(updateData)
        .eq('id', cleanId);

      // If cleanId differed from rawId, also update rawId
      if (rawId.toLowerCase() !== cleanId) {
        await window.sbClient
          .from('team_members')
          .update(updateData)
          .eq('id', rawId);
      }

      // If error (e.g. photo_url column doesn't exist), retry without photo_url
      if (res && res.error) {
        console.warn('Supabase profile update fallback (without photo_url):', res.error);
        delete updateData.photo_url;
        await window.sbClient
          .from('team_members')
          .update(updateData)
          .eq('id', cleanId);
      }

      if (memberObj && typeof SupabaseData !== 'undefined' && SupabaseData.upsertTeamMember) {
        await SupabaseData.upsertTeamMember(memberObj);
      }
    }
  } catch (err) {
    console.warn('Supabase profile sync note:', err);
  }
}

function saveState() {
  save();
}

function renderRoleNotice() {
  const noticeEl = document.getElementById('role-notice');
  const noticeText = document.getElementById('role-notice-text');
  if (!noticeEl || !noticeText) return;

  const isMgr = isManagerRole();
  if (isMgr) {
    noticeEl.className = 'role-notice manager';
    noticeText.innerHTML = `<strong>👑 Delegation Station Active (${STATE.employee.name}):</strong> As Social Media Manager / Agency Owner, you have full delegation rights to assign deliverables across all agency specialists and domain disciplines.`;
  } else {
    noticeEl.className = 'role-notice';
    noticeText.innerHTML = `<strong>Domain: ${STATE.employee.role || 'Specialist'} (${STATE.employee.name}):</strong> You can create self-tasks for your own workflow, accept deliverables assigned to you by Social Media Manager / Owner, and track billable work hours.`;
  }
}

// ========================
// EMPLOYEE STUDIO AUTHENTICATION GATE
// ========================
// ========================
// ASSIGNMENT MATCHING ENGINE (CASE-INSENSITIVE & ROBUST)
// ========================
function isProjectAssignedTo(p, emp) {
  if (!p) return false;
  if (!emp) emp = STATE.employee;
  if (!emp) return true;

  if (emp.isFounder || emp.id === 'EMP-000') return true;

  const empId = String(emp.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const empName = String(emp.name || '').toLowerCase().trim();
  const empRole = String(emp.role || '').toLowerCase().trim();
  const empDomains = (Array.isArray(emp.domains) && emp.domains.length > 0 ? emp.domains : [emp.role])
    .filter(Boolean)
    .map(d => String(d).toLowerCase().trim());

  let assignedArr = [];
  if (Array.isArray(p.assigned)) {
    assignedArr = p.assigned.map(x => String(x || '').toLowerCase().trim());
  } else if (p.assigned) {
    assignedArr = [String(p.assigned).toLowerCase().trim()];
  }
  const assignedToStr = String(p.assignedTo || '').toLowerCase();
  const pService = String(p.service || p.serviceDomain || '').toLowerCase().trim();

  // 1. Direct ID match (e.g. "emp001")
  const matchId = (empId && assignedArr.some(a => a.replace(/[^a-z0-9]/g, '') === empId)) ||
                  (empId && assignedToStr.replace(/[^a-z0-9]/g, '').includes(empId));

  // 2. Direct Name match (case-insensitive)
  const matchName = (empName && assignedArr.some(a => a === empName || empName.includes(a) || a.includes(empName))) ||
                    (empName && (assignedToStr.includes(empName) || empName.includes(assignedToStr)));

  // 3. Domain or Role match
  const matchRole = (empRole && assignedArr.includes(empRole)) ||
                    empDomains.some(d => assignedArr.includes(d) || assignedToStr.includes(d));

  // 4. Service Domain match
  const matchService = pService && (pService === empRole || empDomains.includes(pService));

  return Boolean(matchId || matchName || matchRole || matchService);
}
window.isProjectAssignedTo = isProjectAssignedTo;

function checkEmployeeLogin() {
  const overlay = document.getElementById('emp-login-overlay');
  const loggedInId = localStorage.getItem('da_logged_in_emp');

  if (loggedInId) {
    // 1. Check cached session object in localStorage
    let cachedEmp = null;
    try {
      const raw = localStorage.getItem('da_logged_in_emp_data');
      if (raw) cachedEmp = JSON.parse(raw);
    } catch (e) {}

    const member = (STATE.team || []).find(m => (m.id || '').toLowerCase() === loggedInId.toLowerCase());
    const activeObj = member || cachedEmp;

    if (activeObj) {
      const empDomains = Array.isArray(activeObj.domains) && activeObj.domains.length > 0
        ? activeObj.domains
        : (activeObj.role ? String(activeObj.role).split(',').map(s => s.trim()).filter(Boolean) : ['Video Editor']);
      const primaryDomain = empDomains[0] || 'Video Editor';
      const roleObj = DOMAIN_ROLES.find(r => r.label.toLowerCase() === primaryDomain.toLowerCase()) || { icon: '🎬' };
      const empAvatar = activeObj.avatar || activeObj.photoUrl || localStorage.getItem('da_emp_avatar_' + String(activeObj.id).toLowerCase().replace(/[^a-z0-9]/g, ''));

      STATE.employee = {
        name: activeObj.name,
        id: activeObj.id,
        role: activeObj.role || empDomains.join(', '),
        domains: empDomains,
        isFounder: Boolean(activeObj.isFounder || (activeObj.id && activeObj.id.toLowerCase().replace(/[^a-z0-9]/g, '') === 'emp000')),
        icon: roleObj ? roleObj.icon : '🎬',
        initials: computeInitials(activeObj.name),
        avatar: empAvatar || null,
        photoUrl: empAvatar || null,
      };

      // Keep cached session data fresh
      localStorage.setItem('da_logged_in_emp_data', JSON.stringify(STATE.employee));

      if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
      }
      document.body.style.overflow = '';
      syncProfileUI();
      renderProjects();
      return;
    } else {
      // Logged in ID exists, keep overlay hidden while Supabase hydrates in background!
      if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
      }
      document.body.style.overflow = '';
      return;
    }
  }

  // Strictly only show login gate if user has NO stored session
  if (overlay) {
    overlay.classList.add('show');
    overlay.style.display = 'flex';
  }
  document.body.style.overflow = 'hidden';
}

async function handleEmployeeLogin(e) {
  if (e) e.preventDefault();
  const idInput = document.getElementById('emp-login-id');
  const passInput = document.getElementById('emp-login-pass');
  const id = (idInput?.value || '').trim();
  const pass = (passInput?.value || '').trim();

  if (!id) {
    toast('⚠️ Please enter your Employee ID (e.g. emp001, emp101)', 'error');
    if (idInput) idInput.focus();
    return;
  }
  if (!pass) {
    toast('⚠️ Please enter your password', 'error');
    if (passInput) passInput.focus();
    return;
  }

  const normId = id.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Try finding in loaded team state
  let member = (STATE.team || []).find(m => m.id && m.id.toLowerCase().replace(/[^a-z0-9]/g, '') === normId);

  // 2. Query Supabase directly for real-time authentication
  if (window.sbClient) {
    try {
      const { data, error } = await window.sbClient
        .from('team_members')
        .select('*');

      if (!error && Array.isArray(data)) {
        const matchedDb = data.find(m => m.id && m.id.toLowerCase().replace(/[^a-z0-9]/g, '') === normId);
        if (matchedDb) {
          if (!member) {
            member = {
              id: matchedDb.id,
              name: matchedDb.name,
              role: matchedDb.role,
              shift: matchedDb.shift,
              password: matchedDb.password,
              isFounder: matchedDb.is_founder,
              email: matchedDb.email,
              phone: matchedDb.phone,
              domains: matchedDb.role ? String(matchedDb.role).split(',').map(s => s.trim()).filter(Boolean) : ['Video Editor'],
            };
            if (!STATE.team) STATE.team = [];
            STATE.team.push(member);
          } else {
            // Keep password synchronized with latest in database
            member.password = matchedDb.password;
          }
        }
      }
    } catch (err) {
      console.warn('Supabase auth fallback:', err);
    }
  }

  if (!member) {
    toast(`❌ Employee ID "${id}" does not exist. Only Admin Amaan Khan can add team members!`, 'error');
    if (idInput) {
      idInput.classList.add('error');
      setTimeout(() => idInput.classList.remove('error'), 600);
    }
    return;
  }

  // Check custom local override if any
  const adminSecret = localStorage.getItem('agency_admin_secret_key');
  const isFounderMatch = (member.isFounder || (member.id && member.id.toLowerCase().replace(/[^a-z0-9]/g, '') === 'emp000')) && adminSecret && pass === adminSecret;

  const expectedPass = member.password || (member.isFounder ? 'amnik2026' : '123');
  if (pass !== expectedPass && !isFounderMatch) {
    toast('❌ Incorrect password! Please request credentials from Admin Amaan Khan.', 'error');
    if (passInput) {
      passInput.classList.add('error');
      setTimeout(() => passInput.classList.remove('error'), 600);
    }
    return;
  }

  // Login successful
  localStorage.setItem('da_logged_in_emp', member.id);
  const empDomains = Array.isArray(member.domains) && member.domains.length > 0
    ? member.domains
    : (member.role ? String(member.role).split(',').map(s => s.trim()).filter(Boolean) : ['Video Editor']);
  const primaryDomain = empDomains[0] || 'Video Editor';
  const roleObj = DOMAIN_ROLES.find(r => r.label.toLowerCase() === primaryDomain.toLowerCase()) || { icon: '🎬' };
  const postAvatar = member.avatar || member.photoUrl || localStorage.getItem('da_emp_avatar_' + String(member.id).toLowerCase().replace(/[^a-z0-9]/g, ''));
  STATE.employee = {
    name: member.name,
    id: member.id,
    role: member.role || empDomains.join(', '),
    domains: empDomains,
    isFounder: Boolean(member.isFounder || (member.id && member.id.toLowerCase().replace(/[^a-z0-9]/g, '') === 'emp000')),
    icon: roleObj ? roleObj.icon : '🎬',
    initials: computeInitials(member.name),
    avatar: postAvatar || null,
    photoUrl: postAvatar || null,
  };
  localStorage.setItem('da_logged_in_emp_data', JSON.stringify(STATE.employee));

  (STATE.team || []).forEach(m => {
    m.isCurrent = (m.id.toLowerCase() === member.id.toLowerCase());
  });

  save();
  const overlay = document.getElementById('emp-login-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.style.display = 'none';
  }
  document.body.style.overflow = '';

  syncProfileUI();
  renderProjects();
  addActivity(`Team member logged in: ${member.name} (${member.role})`, 'purple');
  triggerConfetti();
  toast(`Welcome back, ${member.name}! Studio access authorized.`, 'success');
}

function logoutEmployee() {
  if (!confirm(`Sign out from ${STATE.employee.name} (${STATE.employee.id})?`)) return;
  localStorage.removeItem('da_logged_in_emp');
  localStorage.removeItem('da_logged_in_emp_data');
  const overlay = document.getElementById('emp-login-overlay');
  if (overlay) {
    overlay.classList.add('show');
    overlay.style.display = 'flex';
  }
  document.body.style.overflow = 'hidden';
  const idInput = document.getElementById('emp-login-id');
  const passInput = document.getElementById('emp-login-pass');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
  toast('Signed out of Studio workspace.', 'info');
}

// ========================
// LUNCH TIME FORMATTING HELPER
// ========================
function formatLunchDurationDisplay(lunchVal, lunchStart, lunchEnd, status) {
  if (lunchStart && lunchEnd) {
    const s = typeof lunchStart === 'number' ? lunchStart : new Date(lunchStart).getTime();
    const e = typeof lunchEnd === 'number' ? lunchEnd : new Date(lunchEnd).getTime();
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      const totalMins = Math.round((e - s) / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
  }
  if (status === 'lunch' && lunchStart) {
    const s = typeof lunchStart === 'number' ? lunchStart : new Date(lunchStart).getTime();
    if (!isNaN(s)) {
      const elapsedMins = Math.max(0, Math.round((Date.now() - s) / 60000));
      const hrs = Math.floor(elapsedMins / 60);
      const mins = elapsedMins % 60;
      return hrs > 0 ? `${hrs}h ${mins}m (Live)` : `${mins}m (Live)`;
    }
  }
  if (typeof lunchVal === 'string' && lunchVal.trim()) {
    const cleaned = lunchVal.trim();
    if (cleaned.toLowerCase() === 'none' || cleaned === '--:--' || cleaned === '0m') return 'None';
    if (cleaned.includes('h')) return cleaned;
    const mMatch = cleaned.match(/^(\d+)\s*m$/i);
    if (mMatch) {
      const totalMins = parseInt(mMatch[1], 10);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
    return cleaned;
  }
  return 'None';
}

// ========================
// LUNCH PROTOCOL (PRE 2:00 PM / POST 3:00 PM / RESUMPTION)
// ========================
let _lunchModalAction = 'late_end'; // 'early_start' | 'late_start' | 'late_end'

function openLunchProtocolModal(action) {
  _lunchModalAction = action || 'late_end';
  const tagEl = document.getElementById('late-lunch-modal-tag');
  const titleEl = document.getElementById('late-lunch-modal-title');
  const descEl = document.getElementById('late-lunch-modal-desc');
  const timeLabel = document.getElementById('late-lunch-time-label');
  const textarea = document.getElementById('late-lunch-reason-text');
  const submitBtn = document.getElementById('late-lunch-submit-btn');
  const cancelBtn = document.getElementById('late-lunch-cancel-btn');
  const quickBtnsWrap = document.getElementById('late-lunch-quick-buttons');

  const nowTime = fmt(Date.now());
  if (timeLabel) timeLabel.textContent = nowTime;
  if (textarea) {
    textarea.value = '';
    textarea.classList.remove('error');
  }

  if (action === 'early_start') {
    if (tagEl) tagEl.textContent = '⚠️ EARLY LUNCH PROTOCOL (PRE-2:00 PM)';
    if (titleEl) titleEl.textContent = 'Early Lunch Start Justification';
    if (descEl) descEl.innerHTML = `<strong>Attention: Current time is before 2:00 PM (${nowTime}).</strong><br />Official agency lunch break is scheduled strictly between 02:00 PM – 03:00 PM. Please state the operational justification for initiating lunch early. This record will be submitted to Admin <strong>Amaan Khan</strong>.`;
    if (submitBtn) submitBtn.textContent = 'Confirm & Start Early Lunch';
    if (cancelBtn) cancelBtn.textContent = 'Cancel (Stay Working)';
    if (quickBtnsWrap) {
      quickBtnsWrap.innerHTML = `
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🎬 Early Client Shoot / On-Site Recording')">🎬 Early Client Shoot</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🏥 Health / Prescribed Medication Schedule')">🏥 Health / Medication Schedule</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🚗 Studio Field Transit / Client Travel')">🚗 Studio Transit</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('⚡ Shift Schedule Pre-Approval by Admin')">⚡ Shift Pre-Approval</button>
      `;
    }
    if (textarea) textarea.placeholder = 'Explain why you are starting lunch break before 2:00 PM...';
  } else if (action === 'late_start') {
    if (tagEl) tagEl.textContent = '⚠️ LATE LUNCH PROTOCOL (POST-3:00 PM)';
    if (titleEl) titleEl.textContent = 'Late Lunch Start Justification';
    if (descEl) descEl.innerHTML = `<strong>Attention: Current time is past 3:00 PM (${nowTime}).</strong><br />Official agency lunch break is scheduled strictly between 02:00 PM – 03:00 PM. Please state why lunch is starting after the 3:00 PM window. This record will be logged for Admin <strong>Amaan Khan</strong>.`;
    if (submitBtn) submitBtn.textContent = 'Confirm & Start Late Lunch';
    if (cancelBtn) cancelBtn.textContent = 'Cancel (Stay Working)';
    if (quickBtnsWrap) {
      quickBtnsWrap.innerHTML = `
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🎬 Client Shoot / Recording Overrun')">🎬 Shoot Overrun</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('⚡ Urgent Deliverable Client Revision Sprint')">⚡ Urgent Revision Sprint</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('📞 Prolonged Client Strategy Meeting')">📞 Prolonged Client Call</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🚗 Studio Field Delay')">🚗 Studio Field Delay</button>
      `;
    }
    if (textarea) textarea.placeholder = 'Explain why you are starting lunch break after 3:00 PM...';
  } else {
    // late_end (resuming after 3:00 PM)
    if (tagEl) tagEl.textContent = '⚠️ EXTENDED LUNCH PROTOCOL (POST-3:00 PM)';
    if (titleEl) titleEl.textContent = 'Late Lunch Resumption Justification';
    if (descEl) descEl.innerHTML = `<strong>Attention: Current time is past 3:00 PM (${nowTime}).</strong><br />Agency policy mandates all lunch breaks must conclude by 3:00 PM. Please state the operational justification for resuming lunch after 3:00 PM. This record will be logged for Admin <strong>Amaan Khan</strong>.`;
    if (submitBtn) submitBtn.textContent = 'Confirm & Resume Work';
    if (cancelBtn) cancelBtn.textContent = 'Cancel (Stay on Lunch)';
    if (quickBtnsWrap) {
      quickBtnsWrap.innerHTML = `
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🎬 Client Shoot / Recording Overrun')">🎬 Shoot Overrun</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('⚡ Urgent Deliverable Revision Sprint')">⚡ Revision Sprint</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🚗 Transit / Studio Travel Delay')">🚗 Travel Delay</button>
        <button type="button" class="btn-small btn-ghost" onclick="setLateLunchReason('🏥 Personal / Medical Emergency')">🏥 Medical / Emergency</button>
      `;
    }
    if (textarea) textarea.placeholder = 'Explain why lunch concluded after 3:00 PM...';
  }

  openModal('late-lunch-modal');
}

function openLateLunchModal() {
  openLunchProtocolModal('late_end');
}

function setLateLunchReason(val) {
  const textarea = document.getElementById('late-lunch-reason-text');
  if (textarea) {
    textarea.value = val;
    textarea.focus();
  }
}

function submitLateLunchReason() {
  const textarea = document.getElementById('late-lunch-reason-text');
  const reason = (textarea?.value || '').trim();
  if (!reason) {
    if (textarea) textarea.classList.add('error');
    toast('⚠️ Mandatory: Please provide an operational reason for the lunch schedule exception.', 'error');
    return;
  }
  const nowMs = Date.now();
  closeModal('late-lunch-modal');

  if (_lunchModalAction === 'early_start') {
    startLunch(nowMs, `Early Start (Pre-2PM): ${reason}`);
  } else if (_lunchModalAction === 'late_start') {
    startLunch(nowMs, `Late Start (Post-3PM): ${reason}`);
  } else {
    finishLunch(nowMs, `Late Resume (Post-3PM): ${reason}`);
  }
}

function startLunch(nowMs, protocolReason) {
  STATE.attendance.status = 'lunch';
  STATE.attendance.lunchStartTime = nowMs;
  STATE.attendance.lunchEndTime = null;

  const todayDateStr = fmtDate(nowMs);
  if (!STATE.attendance.log) STATE.attendance.log = [];
  let existingLog = STATE.attendance.log.find(l => l.date === todayDateStr && (l.employeeId === STATE.employee.id || l.employee_id === STATE.employee.id));
  if (!existingLog) {
    existingLog = {
      date: todayDateStr,
      employeeId: STATE.employee.id,
      employee_id: STATE.employee.id,
      employeeName: STATE.employee.name,
      checkIn: STATE.attendance.checkInTime || nowMs,
      lunch: 'Ongoing',
      lunchStart: nowMs,
      lunchEnd: null,
      status: 'in' // Present
    };
    STATE.attendance.log.unshift(existingLog);
  } else {
    existingLog.status = 'in'; // Present
    existingLog.lunch = 'Ongoing';
    existingLog.lunchStart = nowMs;
    existingLog.lunchEnd = null;
  }

  if (protocolReason) {
    existingLog.lateLunchReason = protocolReason;
    STATE.attendance.lateLunchReason = protocolReason;
    addActivity(`Started lunch break at ${fmt(nowMs)} · Justification: "${protocolReason}"`, 'orange');
    toast(`Lunch break logged with protocol justification. Recharge!`, 'info');
  } else {
    addActivity(`Started lunch break at ${fmt(nowMs)}`, 'orange');
    toast('Lunch break logged. Relax and recharge!', 'info');
  }

  syncAttendanceUI();
  renderAttLog();
  save();

  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.logAttendance({
      date: todayDateStr,
      checkIn: STATE.attendance.checkInTime,
      lunchStart: nowMs,
      lunchEnd: null,
      lateLunchReason: STATE.attendance.lateLunchReason || null,
      status: 'in', // Record is Present
      photoUrl: STATE.attendance.photoUrl
    });
  }
}

function finishLunch(nowMs, reason) {
  STATE.attendance.status = 'in';
  STATE.attendance.lunchEndTime = nowMs;

  const todayDateStr = fmtDate(nowMs);
  let lunchDurationStr = '0m';
  if (STATE.attendance.lunchStartTime) {
    const ms = Math.max(0, nowMs - STATE.attendance.lunchStartTime);
    const totalMins = Math.round(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    lunchDurationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  if (!STATE.attendance.log) STATE.attendance.log = [];
  const existingLog = STATE.attendance.log.find(l => l.date === todayDateStr && (l.employeeId === STATE.employee.id || l.employee_id === STATE.employee.id));
  if (existingLog) {
    existingLog.status = 'in';
    existingLog.lunch = lunchDurationStr;
    existingLog.lunchEnd = nowMs;
    if (reason) {
      existingLog.lateLunchReason = existingLog.lateLunchReason ? `${existingLog.lateLunchReason} | ${reason}` : reason;
    }
  }

  if (reason) {
    const fullReason = STATE.attendance.lateLunchReason ? `${STATE.attendance.lateLunchReason} | ${reason}` : reason;
    STATE.attendance.lateLunchReason = fullReason;
    if (Array.isArray(STATE.team)) {
      const curr = STATE.team.find(m => m.id === STATE.employee.id || m.isCurrent);
      if (curr) {
        curr.lateLunchReason = fullReason;
        curr.lateLunchTime = nowMs;
      }
    }
    addActivity(`Resumed work at ${fmt(nowMs)} · Justification: "${reason}"`, 'orange');
    toast(`Lunch resumption justification logged: "${reason}". Momentum resumed!`, 'info');
  } else {
    addActivity(`Resumed work at ${fmt(nowMs)} (Duration: ${lunchDurationStr})`, 'green');
    toast(`Welcome back! Lunch break (${lunchDurationStr}) concluded.`, 'success');
  }

  syncAttendanceUI();
  renderAttLog();
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.logAttendance({
      date: todayDateStr,
      checkIn: STATE.attendance.checkInTime,
      lunchStart: STATE.attendance.lunchStartTime,
      lunchEnd: nowMs,
      lateLunchReason: STATE.attendance.lateLunchReason || null,
      status: 'in',
      photoUrl: STATE.attendance.photoUrl
    });
  }
}

// ========================
// LIVE CLOCK & SHIFT PROGRESS
// ========================
function updateClock() {
  const now = new Date();
  const clockEl = document.getElementById('live-clock');
  if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-IN', { hour12: false });

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const liveDate = document.getElementById('live-date');
  if (liveDate) liveDate.textContent = dateStr;

  const attDate = document.getElementById('att-date-label');
  if (attDate) attDate.textContent = dateStr;

  const h = now.getHours();
  let greet = 'Good Morning ☀️';
  if (h >= 12 && h < 17) greet = 'Good Afternoon ⚡';
  else if (h >= 17) greet = 'Good Evening 🌙';

  const greetEl = document.getElementById('greet-text');
  if (greetEl) greetEl.textContent = greet;

  // Calculate Shift Progress (10:00 AM to 07:00 PM)
  const shiftStart = 10;
  const shiftEnd = 19;
  const curHours = h + now.getMinutes() / 60;
  let pct = 0;
  if (curHours >= shiftEnd) pct = 100;
  else if (curHours > shiftStart) {
    pct = Math.round(((curHours - shiftStart) / (shiftEnd - shiftStart)) * 100);
  }
  const hudFill = document.getElementById('shift-hud-fill');
  if (hudFill) hudFill.style.width = `${pct}%`;
  const hudPct = document.getElementById('shift-hud-pct');
  if (hudPct) hudPct.textContent = `${pct}% of Day Window`;

  if (h >= 19) {
    evaluateAutoAbsent();
  }
}

// ========================
// MOTIVATIONAL SPARK ENGINE (100% EMPLOYEE DISCIPLINE — 30-MIN ROTATION)
// ========================
let _quoteIndex = -1;
let _quote30MinTimer = null;
const QUOTE_INTERVAL_MS = 30 * 60 * 1000; // Half an hour (30 minutes)

function rotateQuote() {
  const quoteTextEl = document.getElementById('hourly-quote-text');
  const quoteAuthorEl = document.getElementById('hourly-quote-author');
  if (!quoteTextEl || !quoteAuthorEl) return;

  const pool = (typeof HOURLY_QUOTES !== 'undefined' && Array.isArray(HOURLY_QUOTES) && HOURLY_QUOTES.length > 0)
    ? HOURLY_QUOTES
    : [
        { t: "Discipline is choosing between what you want now and what you want most.", a: "Discipline Law" },
        { t: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
        { t: "Discipline equals freedom. Own your day before it owns you.", a: "Jocko Willink" },
        { t: "Don't stop when you're tired. Stop when the deliverable is done.", a: "David Goggins" },
        { t: "You do not rise to your goals; you fall to your systems.", a: "James Clear" },
        { t: "Work hard in silence, let your finished projects make the noise.", a: "Workplace Axiom" }
      ];

  if (_quoteIndex === -1) {
    // Pick initial quote based on 30-minute time slice
    const timeSlice = Math.floor(Date.now() / QUOTE_INTERVAL_MS);
    const hash = ((timeSlice ^ 0x5DEECE66D) * 25214903917) >>> 0;
    _quoteIndex = hash % pool.length;
  } else {
    // Progressive cycle through the pool
    _quoteIndex = (_quoteIndex + 1) % pool.length;
  }

  const item = pool[_quoteIndex];

  // Smooth fade transition
  quoteTextEl.classList.add('fade-out');
  quoteAuthorEl.classList.add('fade-out');

  setTimeout(() => {
    quoteTextEl.textContent = item.t;
    quoteAuthorEl.textContent = `— ${item.a}`;
    quoteTextEl.classList.remove('fade-out');
    quoteAuthorEl.classList.remove('fade-out');
  }, 200);
}

// Auto-rotate every half hour (30 minutes)
if (_quote30MinTimer) clearInterval(_quote30MinTimer);
_quote30MinTimer = setInterval(rotateQuote, QUOTE_INTERVAL_MS);

setInterval(updateClock, 1000);
updateClock();

// ========================
// CURSOR SPOTLIGHT TRACKER
// ========================
document.addEventListener('mousemove', (e) => {
  const spot = document.getElementById('cursor-spotlight');
  if (spot) {
    spot.style.left = `${e.clientX}px`;
    spot.style.top = `${e.clientY}px`;
  }
});

// ========================
// SIDEBAR & NAVIGATION
// ========================
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mw = document.querySelector('.main-wrap');
  const bd = document.getElementById('sidebar-backdrop');
  if (window.innerWidth <= 992) {
    const isOpen = sb.classList.toggle('open');
    if (bd) bd.classList.toggle('active', isOpen);
  } else {
    sb.classList.toggle('collapsed');
    mw.classList.toggle('full');
  }
}

function showSection(name, el) {
  if (window.innerWidth <= 992) {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    if (sb) sb.classList.remove('open');
    if (bd) bd.classList.remove('active');
  }

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById('section-' + name);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Executive Dashboard',
    attendance: 'Attendance Tracker',
    projects: 'Deliverables & Project Board',
    calendars: 'Social Media Content Calendars',
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[name] || name;

  if (name === 'projects') renderProjects();
  if (name === 'attendance') renderAttLog();
  if (name === 'calendars') renderCalendars();
}

// Keyboard shortcuts (⌘1, ⌘2, ⌘3, ⌘4)
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === '1') { e.preventDefault(); showSection('dashboard', document.querySelector('[data-section=dashboard]')); }
    if (e.key === '2') { e.preventDefault(); showSection('attendance', document.querySelector('[data-section=attendance]')); }
    if (e.key === '3') { e.preventDefault(); showSection('projects', document.querySelector('[data-section=projects]')); }
    if (e.key === '4') { e.preventDefault(); showSection('calendars', document.querySelector('[data-section=calendars]')); }
  }
});

// ========================
// ATTENDANCE LOGIC
// ========================
function updateMilestonesUI() {
  const att = STATE.attendance;
  const s1 = document.getElementById('step-checkin');
  const s2 = document.getElementById('step-lunch-start');
  const s3 = document.getElementById('step-lunch-end');
  const s4 = document.getElementById('step-checkout');
  const l1 = document.getElementById('line-1');
  const l2 = document.getElementById('line-2');
  const l3 = document.getElementById('line-3');

  [s1, s2, s3, s4].forEach(s => s && s.classList.remove('done'));
  [l1, l2, l3].forEach(l => l && l.classList.remove('done'));

  if (att.checkInTime) {
    if (s1) s1.classList.add('done');
    if (l1) l1.classList.add('done');
  }
  if (att.lunchStartTime) {
    if (s2) s2.classList.add('done');
    if (l2) l2.classList.add('done');
  }
  if (att.lunchEndTime) {
    if (s3) s3.classList.add('done');
    if (l3) l3.classList.add('done');
  }
  if (att.checkOutTime) {
    if (s4) s4.classList.add('done');
  }
}

function syncAttendanceUI() {
  const att = STATE.attendance;
  const dot = document.getElementById('att-dot');
  const statusText = document.getElementById('att-status-text');
  const btnIn = document.getElementById('btn-checkin');
  const btnLunch = document.getElementById('btn-lunch');
  const btnOut = document.getElementById('btn-checkout');
  const lunchTxt = document.getElementById('lunch-btn-txt');
  const avatarStatusDot = document.getElementById('avatar-status-dot');
  const sidebarStatusText = document.getElementById('sidebar-status-text');

  document.getElementById('att-checkin-val').textContent = fmt(att.checkInTime);
  document.getElementById('att-lunch-start-val').textContent = fmt(att.lunchStartTime);
  document.getElementById('att-lunch-end-val').textContent = fmt(att.lunchEndTime);
  document.getElementById('att-checkout-val').textContent = fmt(att.checkOutTime);

  updateMilestonesUI();

  dot.className = 'radar-ping-dot';
  if (att.status === 'in') {
    dot.classList.add('active');
    statusText.textContent = 'Active In Studio — Working';
    btnIn.disabled = true;
    btnLunch.disabled = false;
    btnOut.disabled = false;
    lunchTxt.textContent = 'Take Lunch Break';

    document.getElementById('dash-status').textContent = 'In Studio';
    const b = document.getElementById('dash-status-badge');
    b.textContent = 'Present';
    b.className = 'stat-badge green';
    document.getElementById('dash-status-sub').textContent = `Checked in at ${fmt(att.checkInTime)}`;

    if (avatarStatusDot) avatarStatusDot.style.background = 'var(--emerald-400)';
    if (sidebarStatusText) sidebarStatusText.textContent = 'In Studio';
  } else if (att.status === 'lunch') {
    dot.classList.add('lunch');
    statusText.textContent = 'On Lunch Break';
    btnIn.disabled = true;
    btnLunch.disabled = false;
    btnOut.disabled = true;
    lunchTxt.textContent = 'Resume Work';

    document.getElementById('dash-status').textContent = 'Lunch Break';
    const b = document.getElementById('dash-status-badge');
    b.textContent = 'Break';
    b.className = 'stat-badge orange';
    document.getElementById('dash-status-sub').textContent = 'Break in progress';

    if (avatarStatusDot) avatarStatusDot.style.background = 'var(--amber-400)';
    if (sidebarStatusText) sidebarStatusText.textContent = 'Lunch';
  } else if (att.status === 'done') {
    dot.classList.add('out');
    statusText.textContent = 'Checked Out for Today';
    btnIn.disabled = true;
    btnLunch.disabled = true;
    btnOut.disabled = true;

    document.getElementById('dash-status').textContent = 'Checked Out';
    const b = document.getElementById('dash-status-badge');
    b.textContent = 'Done';
    b.className = 'stat-badge purple';
    document.getElementById('dash-status-sub').textContent = `Out at ${fmt(att.checkOutTime)}`;

    if (avatarStatusDot) avatarStatusDot.style.background = 'var(--violet-400)';
    if (sidebarStatusText) sidebarStatusText.textContent = 'Shift Done';

    showAttendanceSummary();
  } else if (att.status === 'absent' || (att.status === 'out' && new Date().getHours() >= 19)) {
    dot.className = 'radar-ping-dot out';
    statusText.textContent = 'Shift Ended — Marked Absent (7:00 PM Deadline Passed)';
    btnIn.disabled = true;
    btnLunch.disabled = true;
    btnOut.disabled = true;

    document.getElementById('dash-status').textContent = 'Marked Absent';
    const b = document.getElementById('dash-status-badge');
    b.textContent = 'Absent';
    b.className = 'stat-badge red';
    b.style.background = 'rgba(239,68,68,0.2)';
    b.style.color = '#fca5a5';
    b.style.border = '1px solid rgba(239,68,68,0.4)';
    document.getElementById('dash-status-sub').textContent = 'Did not punch check-in before 7:00 PM shift deadline';

    if (avatarStatusDot) avatarStatusDot.style.background = '#f87171';
    if (sidebarStatusText) sidebarStatusText.textContent = 'Absent';
  } else {
    dot.className = 'radar-ping-dot';
    statusText.textContent = 'Not Checked In Yet';
    btnIn.disabled = false;
    btnLunch.disabled = true;
    btnOut.disabled = true;

    document.getElementById('dash-status').textContent = 'Pending Punch In';
    const b = document.getElementById('dash-status-badge');
    b.textContent = 'Pending';
    b.className = 'stat-badge orange';
    document.getElementById('dash-status-sub').textContent = 'Shift active: Click to Punch In with photo';

    if (avatarStatusDot) avatarStatusDot.style.background = '#64748b';
    if (sidebarStatusText) sidebarStatusText.textContent = 'Offline';
  }
}

function evaluateAutoAbsent() {
  const now = new Date();
  if (now.getHours() < 19) return;

  const todayDateStr = fmtDate(Date.now());
  const hasCheckedInToday = STATE.attendance.checkInTime && (fmtDate(STATE.attendance.checkInTime) === todayDateStr);
  const hasLogToday = Array.isArray(STATE.attendance.log) && STATE.attendance.log.some(l => l.date === todayDateStr && (l.status === 'in' || l.status === 'lunch' || l.status === 'done' || l.status === 'Completed'));

  if (!hasCheckedInToday && !hasLogToday) {
    if (STATE.attendance.status === 'out' || !STATE.attendance.status || STATE.attendance.status === 'absent') {
      STATE.attendance.status = 'absent';
      if (!STATE.attendance.log) STATE.attendance.log = [];
      const alreadyAbsentLogged = STATE.attendance.log.some(l => l.date === todayDateStr && (l.status === 'Absent' || l.status === 'absent'));
      if (!alreadyAbsentLogged) {
        STATE.attendance.log.unshift({
          id: 'att-absent-' + uid(),
          employeeId: STATE.employee.id,
          employeeName: STATE.employee.name,
          date: todayDateStr,
          checkIn: '--:--',
          lunch: 'None',
          checkOut: '--:--',
          workHrs: '0h 0m',
          status: 'Absent',
          effectiveHours: '0h 0m',
          autoMarked: true,
        });
        save();
        if (typeof SupabaseData !== 'undefined') {
          SupabaseData.logAttendance({
            date: todayDateStr,
            checkIn: null,
            checkOut: null,
            effectiveHours: '0h 0m',
            status: 'absent'
          });
        }
        renderAttLog();
      }
    }
  }
}

function updateHoursRing(totalMs) {
  const targetMs = 8 * 3600 * 1000;
  const pct = Math.min(100, Math.round((totalMs / targetMs) * 100));
  const ring = document.getElementById('hours-ring-fill');
  if (ring) {
    ring.setAttribute('stroke-dasharray', `${pct}, 100`);
  }
  const ringTxt = document.getElementById('ring-center-txt');
  if (ringTxt) ringTxt.textContent = `${pct}%`;
}

function startAttElapsed() {
  clearInterval(STATE.attendance.elapsedInterval);
  STATE.attendance.elapsedInterval = setInterval(() => {
    if (STATE.attendance.status === 'in' || STATE.attendance.status === 'lunch') {
      const now = Date.now();
      let total = now - STATE.attendance.checkInTime;
      if (STATE.attendance.lunchStartTime && STATE.attendance.lunchEndTime) {
        total -= (STATE.attendance.lunchEndTime - STATE.attendance.lunchStartTime);
      } else if (STATE.attendance.lunchStartTime) {
        total -= (now - STATE.attendance.lunchStartTime);
      }
      if (total < 0) total = 0;
      const elText = fmtHHMMSS(total);
      const el1 = document.getElementById('att-elapsed');
      if (el1) el1.textContent = elText;
      const el2 = document.getElementById('dash-workhrs');
      if (el2) el2.textContent = fmtDuration(total);

      updateHoursRing(total);
    }
  }, 1000);
}

// ========================
// CHECK-IN SELFIE & CAMERA VERIFICATION ENGINE (COMPRESSED + 7-DAY RETENTION)
// ========================
function compressImage(fileOrDataUrl, maxWidth = 640, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      // Clean compressed JPEG (average 25-45 KB)
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = reject;

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

let _selfieCameraStream = null;
let _pendingSelfieDataUrl = null;

function openCheckInPhotoModal() {
  if (STATE.attendance && STATE.attendance.status === 'in') {
    toast('⚠️ You are already Checked In for today!', 'info');
    return;
  }
  if (STATE.attendance && STATE.attendance.status === 'done') {
    toast('⚠️ You have already concluded your shift for today!', 'info');
    return;
  }

  _pendingSelfieDataUrl = null;
  resetSelfieCapture();
  openModal('checkin-photo-modal');
  startCameraSelfie();
}

function cancelCheckInPhoto() {
  stopCameraStream();
  closeModal('checkin-photo-modal');
}

function resetSelfieCapture() {
  stopCameraStream();
  _pendingSelfieDataUrl = null;
  const prevBox = document.getElementById('selfie-preview-box');
  const streamBox = document.getElementById('camera-stream-box');
  const phBox = document.getElementById('selfie-placeholder-box');
  const confirmBtn = document.getElementById('btn-confirm-checkin-photo');
  const fileInput = document.getElementById('selfie-file-input');

  if (prevBox) prevBox.style.display = 'none';
  if (streamBox) streamBox.style.display = 'none';
  if (phBox) phBox.style.display = 'block';
  if (confirmBtn) confirmBtn.disabled = true;
  if (fileInput) fileInput.value = '';
}

async function startCameraSelfie() {
  resetSelfieCapture();
  const streamBox = document.getElementById('camera-stream-box');
  const phBox = document.getElementById('selfie-placeholder-box');
  const video = document.getElementById('selfie-video');

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('📷 Camera not supported on this device. Please upload a picture.', 'error');
      triggerSelfieFileUpload();
      return;
    }

    _selfieCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });

    if (video) {
      video.srcObject = _selfieCameraStream;
      await video.play();
    }
    if (phBox) phBox.style.display = 'none';
    if (streamBox) streamBox.style.display = 'block';
  } catch (err) {
    console.warn('Camera access denied or unavailable:', err);
    toast('📷 Camera access denied or unavailable. Please upload a picture instead.', 'info');
    stopCameraStream();
    triggerSelfieFileUpload();
  }
}

function stopCameraStream() {
  if (_selfieCameraStream) {
    _selfieCameraStream.getTracks().forEach(t => t.stop());
    _selfieCameraStream = null;
  }
  const video = document.getElementById('selfie-video');
  if (video) video.srcObject = null;
  const streamBox = document.getElementById('camera-stream-box');
  if (streamBox) streamBox.style.display = 'none';
}

async function snapCameraPhoto() {
  const video = document.getElementById('selfie-video');
  if (!video || !video.videoWidth) {
    toast('⚠️ Camera stream not ready yet. Please wait a second.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const rawData = canvas.toDataURL('image/jpeg', 0.9);

  try {
    const compressed = await compressImage(rawData, 640, 0.65);
    _pendingSelfieDataUrl = compressed;
    stopCameraStream();
    displaySelfiePreview(compressed);
  } catch (err) {
    console.error('Photo compression error:', err);
    toast('Error processing photo', 'error');
  }
}

function triggerSelfieFileUpload() {
  stopCameraStream();
  const fileInput = document.getElementById('selfie-file-input');
  if (fileInput) fileInput.click();
}

async function handleSelfieFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    toast('⚡ Compressing image for Supabase storage...', 'info');
    const compressed = await compressImage(file, 640, 0.65);
    _pendingSelfieDataUrl = compressed;
    displaySelfiePreview(compressed);
  } catch (err) {
    console.error('File compression error:', err);
    toast('❌ Error compressing photo. Try another image.', 'error');
  }
}

function displaySelfiePreview(dataUrl) {
  const phBox = document.getElementById('selfie-placeholder-box');
  const streamBox = document.getElementById('camera-stream-box');
  const prevBox = document.getElementById('selfie-preview-box');
  const prevImg = document.getElementById('selfie-preview-img');
  const sizePill = document.getElementById('selfie-size-pill');
  const confirmBtn = document.getElementById('btn-confirm-checkin-photo');

  if (phBox) phBox.style.display = 'none';
  if (streamBox) streamBox.style.display = 'none';
  if (prevImg) prevImg.src = dataUrl;
  if (prevBox) prevBox.style.display = 'block';

  const kb = Math.round((dataUrl.length * 0.75) / 1024);
  if (sizePill) sizePill.textContent = `(~${kb} KB)`;
  if (confirmBtn) confirmBtn.disabled = false;
  toast('✅ Photo verified & ready for Check In!', 'success');
}

function confirmCheckInWithPhoto() {
  if (!_pendingSelfieDataUrl) {
    toast('⚠️ Please take a selfie or upload a photo to verify your check-in!', 'error');
    return;
  }
  const photo = _pendingSelfieDataUrl;
  cancelCheckInPhoto();
  doCheckIn(photo);
}

function doCheckIn(photoUrl) {
  const now = Date.now();
  STATE.attendance.status = 'in';
  STATE.attendance.checkInTime = now;
  STATE.attendance.lunchStartTime = null;
  STATE.attendance.lunchEndTime = null;
  STATE.attendance.checkOutTime = null;
  STATE.attendance.photoUrl = photoUrl || null;

  const todayDateStr = fmtDate(now);
  if (!STATE.attendance.log) STATE.attendance.log = [];
  const existingLog = (STATE.attendance.log || []).find(l => l.date === todayDateStr && (l.employeeId === STATE.employee.id || l.employee_id === STATE.employee.id));
  if (existingLog) {
    existingLog.checkIn = now;
    existingLog.status = 'in';
    existingLog.lunch = existingLog.lunch || 'None';
    existingLog.checkOut = existingLog.checkOut || '--:--';
    existingLog.workHrs = existingLog.workHrs || 'Working live';
    if (photoUrl) existingLog.photoUrl = photoUrl;
  } else {
    STATE.attendance.log.unshift({
      id: 'att-' + uid(),
      employeeId: STATE.employee.id,
      employeeName: STATE.employee.name,
      date: todayDateStr,
      checkIn: now,
      lunch: 'None',
      checkOut: '--:--',
      workHrs: 'Working live',
      status: 'in',
      photoUrl: photoUrl || null,
      effectiveHours: '0h 0m'
    });
  }

  syncAttendanceUI();
  startAttElapsed();
  addActivity(`Checked In with verified photo at ${fmt(now)}`, 'green');
  triggerConfetti();
  toast('📸 Check-In Verified with Photo! Have a powerhouse session.', 'success');
  save();

  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.logAttendance({
      date: todayDateStr,
      checkIn: now,
      status: 'in',
      photoUrl: photoUrl || null
    });
  }
}

function doLunch() {
  const now = new Date();
  const nowMs = now.getTime();
  const currentHour = now.getHours();

  if (STATE.attendance.status === 'in') {
    // 1. Before 2:00 PM (14:00) -> Prompt Early Lunch Protocol Modal
    if (currentHour < 14) {
      openLunchProtocolModal('early_start');
      return;
    }
    // 2. At or after 3:00 PM (15:00) -> Prompt Late Lunch Protocol Modal
    if (currentHour >= 15) {
      openLunchProtocolModal('late_start');
      return;
    }
    // 3. Normal Window (14:00 - 14:59) -> Start Lunch directly
    startLunch(nowMs, null);
  } else if (STATE.attendance.status === 'lunch') {
    // If lunch ends at or after 3:00 PM (15:00), prompt Late Resumption Protocol Modal
    if (currentHour >= 15) {
      openLunchProtocolModal('late_end');
      return;
    }
    // Concluded before 3:00 PM -> Finish Lunch directly
    finishLunch(nowMs, null);
  }
}

function doCheckOut() {
  if (!confirm('Are you ready to Punch Out and conclude today’s session?')) return;
  const now = Date.now();
  STATE.attendance.status = 'done';
  STATE.attendance.checkOutTime = now;
  clearInterval(STATE.attendance.elapsedInterval);

  let totalMs = now - STATE.attendance.checkInTime;
  let lunchMs = 0;
  if (STATE.attendance.lunchStartTime) {
    const lend = STATE.attendance.lunchEndTime || now;
    lunchMs = Math.max(0, lend - STATE.attendance.lunchStartTime);
    totalMs -= lunchMs;
  }
  if (totalMs < 0) totalMs = 0;

  let lunchDurationStr = 'None';
  if (lunchMs > 0) {
    const totalMins = Math.round(lunchMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    lunchDurationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  STATE.attendance.log.unshift({
    date: fmtDate(now),
    checkIn: fmt(STATE.attendance.checkInTime),
    lunch: lunchDurationStr,
    lunchStart: STATE.attendance.lunchStartTime,
    lunchEnd: STATE.attendance.lunchEndTime || now,
    lateLunchReason: STATE.attendance.lateLunchReason || null,
    checkOut: fmt(now),
    workHrs: fmtDuration(totalMs),
    status: 'done', // Rendered as Present
  });

  syncAttendanceUI();
  renderAttLog();
  updateHoursRing(totalMs);
  triggerConfetti();
  addActivity(`Checked Out at ${fmt(now)} — Completed ${fmtDuration(totalMs)}`, 'purple');
  toast(`Checked Out! Outstanding work: ${fmtDuration(totalMs)} total.`, 'success');
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.logAttendance({
      date: fmtDate(now),
      checkIn: STATE.attendance.checkInTime,
      lunchStart: STATE.attendance.lunchStartTime,
      lunchEnd: STATE.attendance.lunchEndTime || now,
      checkOut: now,
      effectiveHours: fmtDuration(totalMs),
      lateLunchReason: STATE.attendance.lateLunchReason,
      status: 'done'
    });
  }
}

function showAttendanceSummary() {
  const sumEl = document.getElementById('att-summary');
  if (!sumEl) return;
  sumEl.style.display = 'flex';

  const inTime = STATE.attendance.checkInTime;
  const outTime = STATE.attendance.checkOutTime || Date.now();
  let total = outTime - inTime;
  let lunch = 0;
  if (STATE.attendance.lunchStartTime) {
    const lend = STATE.attendance.lunchEndTime || outTime;
    lunch = Math.max(0, lend - STATE.attendance.lunchStartTime);
    total -= lunch;
  }
  const totalMins = Math.round(lunch / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const lunchStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  document.getElementById('att-total-work').textContent = fmtDuration(total);
  document.getElementById('att-lunch-dur').textContent = lunchStr;
}

function renderAttLog() {
  const tbody = document.getElementById('att-log-body');
  if (!tbody) return;
  if (!STATE.attendance.log || STATE.attendance.log.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-td">No attendance records logged yet</td></tr>';
    return;
  }
  tbody.innerHTML = STATE.attendance.log.map(r => {
    const checkInStr = typeof r.checkIn === 'number' ? fmt(r.checkIn) : (r.checkIn || '--:--');
    const checkOutStr = typeof r.checkOut === 'number' ? fmt(r.checkOut) : (r.checkOut || '--:--');
    
    // Format lunch duration in hours and minutes
    const lunchDurFormatted = formatLunchDurationDisplay(r.lunch, r.lunchStart || r.lunchStartTime, r.lunchEnd || r.lunchEndTime, r.status);
    
    const workHrsStr = (r.workHrs && r.workHrs !== 'undefined') ? r.workHrs : (r.effectiveHours && r.effectiveHours !== 'undefined' ? r.effectiveHours : (r.status === 'in' ? 'Working live' : '0h 0m'));
    
    // STRICT USER REQUIREMENT: Status only shows "Present" or "Absent"
    const rawStatus = String(r.status || '').toLowerCase();
    const isAbsent = (rawStatus === 'absent');
    const statusLabel = isAbsent ? '● Absent' : '● Present';
    const statusClass = isAbsent ? 'red' : 'green';

    const reasonText = r.lateLunchReason || r.late_lunch_reason || '';

    return `
      <tr>
        <td data-label="Date"><strong>${r.date || fmtDate(Date.now())}</strong></td>
        <td data-label="Check In">
          <div style="display:flex;align-items:center;gap:6px">
            <strong>${checkInStr}</strong>
            ${r.photoUrl ? `<span title="Selfie photo verified" style="cursor:pointer;font-size:12px">📸</span>` : ''}
          </div>
        </td>
        <td data-label="Lunch Time">
          <strong style="color:#fcd34d">${lunchDurFormatted}</strong>
          ${reasonText ? `<div style="font-size:10px;color:var(--amber-400);margin-top:2px" title="Protocol Justification: ${reasonText}">⚠️ ${reasonText}</div>` : ''}
        </td>
        <td data-label="Check Out"><span>${checkOutStr}</span></td>
        <td data-label="Effective Hours"><span class="stat-badge purple">${workHrsStr}</span></td>
        <td data-label="Status"><span class="stat-badge ${statusClass}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');
}

function clearAttLog() {
  toast('Attendance records are permanent agency logs. Only Admin can clear attendance history.', 'warning');
}

// ========================
// PROJECTS & ROLE DELEGATION
// ========================
function renderProjectAssignOptions(existingAssigned = []) {
  const container = document.getElementById('assign-options');
  if (!container) return;

  const isMgr = isManagerRole();

  if (!isMgr) {
    // Non-managers: Dedicated Self-Task assignment box
    container.innerHTML = `
      <div style="width:100%;padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:10px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
          👤
        </div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;color:#93c5fd;display:flex;align-items:center;gap:6px">
            Self-Task: Assigned to You (${STATE.employee.name})
            <span class="stat-badge blue" style="font-size:10px;padding:1px 6px">Personal Workflow</span>
          </div>
          <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">
            You are creating this deliverable for your own task queue. Delegation to other specialists is reserved for Social Media Managers & Agency Owner.
          </div>
        </div>
        <input type="checkbox" value="${STATE.employee.name}" checked style="display:none" />
      </div>
    `;
    return;
  }

  // Manager or Agency Owner: Full delegation picker across all specialists & domain disciplines
  const staff = (STATE.team || []);
  const options = [
    // 1. Current user
    { label: `👑 ${STATE.employee.name} (You • ${STATE.employee.id})`, value: STATE.employee.name },
    // 2. All other team members
    ...staff.filter(t => t.name !== STATE.employee.name).map(t => {
      const roleText = t.role || (Array.isArray(t.domains) ? t.domains.join(', ') : 'Staff Specialist');
      return {
        label: `👤 ${t.name} (${t.id} • ${roleText})`,
        value: t.name
      };
    }),
    // 3. Domain Roles
    { label: '🎬 Video Editor', value: 'Video Editor' },
    { label: '📱 Social Media Management', value: 'Social Media Management' },
    { label: '🎨 Graphic Designer', value: 'Graphic Design' },
    { label: '✍️ Content Creator', value: 'Content Creator / Writer' },
    { label: '💰 Paid Ads Specialist', value: 'Paid Ads Specialist' },
    { label: '🔍 SEO Specialist', value: 'SEO Specialist' },
    { label: '💻 Web Developer', value: 'Web Developer' },
  ];

  container.innerHTML = `
    <div style="width:100%;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <span class="assign-manager-badge" style="background:rgba(52,211,153,0.15);color:#34d399;border-color:rgba(52,211,153,0.3)">
        ⚡ Select Specialist(s) or Domain(s) to Assign (Manager Delegation)
      </span>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn-small btn-secondary" onclick="assignSelectMyself()" style="font-size:10.5px;padding:2px 8px">Only Me</button>
        <button type="button" class="btn-small btn-secondary" onclick="assignSelectAllSpecialists()" style="font-size:10.5px;padding:2px 8px">All Specialists</button>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${options.map(opt => {
        const isChecked = existingAssigned.length
          ? (existingAssigned.includes(opt.value) || existingAssigned.some(a => opt.label.includes(a)))
          : (opt.value === STATE.employee.name);
        return `
          <label class="assign-chip ${isChecked ? 'selected' : ''}">
            <input type="checkbox" value="${opt.value}" ${isChecked ? 'checked' : ''} />
            ${opt.label}
          </label>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.assign-chip').forEach(chip => {
    chip.addEventListener('click', function (e) {
      if (e.target.tagName !== 'INPUT') {
        const cb = this.querySelector('input');
        cb.checked = !cb.checked;
      }
      const cb = this.querySelector('input');
      this.classList.toggle('selected', cb.checked);
    });
  });
}

function assignSelectMyself() {
  const chips = document.querySelectorAll('#assign-options .assign-chip');
  chips.forEach(chip => {
    const cb = chip.querySelector('input');
    const isMe = cb && cb.value === STATE.employee.name;
    if (cb) cb.checked = isMe;
    chip.classList.toggle('selected', isMe);
  });
}

function assignSelectAllSpecialists() {
  const chips = document.querySelectorAll('#assign-options .assign-chip');
  const staffNames = (STATE.team || []).map(t => t.name);
  chips.forEach(chip => {
    const cb = chip.querySelector('input');
    const isStaff = cb && (staffNames.includes(cb.value) || cb.value === STATE.employee.name);
    if (cb && isStaff) cb.checked = true;
    if (isStaff) chip.classList.add('selected');
  });
}

function openProjectModal(id) {
  STATE.editingProjectId = id || null;
  const title = document.getElementById('proj-modal-title');
  if (title) title.textContent = id ? 'Edit Deliverable' : 'Create New Deliverable';

  if (id) {
    const p = STATE.projects.find(x => x.id === id);
    if (p) {
      document.getElementById('proj-name').value = p.name || '';
      document.getElementById('proj-client').value = p.client || '';
      document.getElementById('proj-priority').value = p.priority || 'Medium';
      document.getElementById('proj-service').value = p.service || 'Video Editing';
      document.getElementById('proj-deadline').value = p.deadline || '';
      document.getElementById('proj-desc').value = p.desc || '';
      renderProjectAssignOptions(p.assigned || []);
    }
  } else {
    document.getElementById('proj-name').value = '';
    document.getElementById('proj-client').value = '';
    document.getElementById('proj-priority').value = 'Medium';
    document.getElementById('proj-service').value = STATE.employee.role || 'Web Developer';
    document.getElementById('proj-deadline').value = '';
    document.getElementById('proj-desc').value = '';
    renderProjectAssignOptions([STATE.employee.name]);
  }
  openModal('project-modal');
}

function saveProject() {
  const name = document.getElementById('proj-name').value.trim();
  if (!name) { toast('Project name is required', 'error'); return; }

  const isMgr = isManagerRole();
  let assigned;
  if (isMgr) {
    const checks = document.querySelectorAll('#assign-options input[type=checkbox]:checked');
    assigned = Array.from(checks).map(c => c.value);
    if (!assigned.length) assigned = [STATE.employee.name];
  } else {
    // Specialists create self-tasks strictly assigned to their personal queue
    assigned = [STATE.employee.name];
  }

  const client = document.getElementById('proj-client').value.trim() || 'Internal Agency';
  const service = document.getElementById('proj-service').value;
  const priority = document.getElementById('proj-priority').value;
  const deadline = document.getElementById('proj-deadline').value;
  const desc = document.getElementById('proj-desc').value.trim();

  // If created as a self-task by specialist, status starts as 'In Progress' ready to execute; if delegated by manager, 'Assigned'
  const initialStatus = isMgr ? 'Assigned' : 'In Progress';

  const project = {
    id: STATE.editingProjectId || uid(),
    name,
    client,
    priority,
    service,
    serviceDomain: service,
    deadline,
    desc,
    assigned,
    assignedTo: assigned.join(', '),
    status: initialStatus,
    progress: 15,
    totalTimeSpent: 0,
    sessions: [],
    createdAt: Date.now(),
  };

  if (STATE.editingProjectId) {
    const idx = STATE.projects.findIndex(x => x.id === STATE.editingProjectId);
    if (idx !== -1) {
      project.status = STATE.projects[idx].status;
      project.progress = STATE.projects[idx].progress || 50;
      project.createdAt = STATE.projects[idx].createdAt;
      project.totalTimeSpent = STATE.projects[idx].totalTimeSpent || 0;
      project.sessions = STATE.projects[idx].sessions || [];
      STATE.projects[idx] = project;
    }
    toast('Deliverable updated!', 'success');
  } else {
    STATE.projects.unshift(project);
    addActivity(`Project created: ${name} (Assigned to ${assigned.join(', ')})`, 'blue');
    triggerConfetti();
    toast(`Deliverable added & assigned to ${assigned.join(', ')}! 🚀`, 'success');
  }

  updateDashCounts();
  renderProjects();
  populateTimerSelect();
  closeModal('project-modal');
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.upsertProject(project);
  }
}

let _activeFilter = 'all';
function filterProjects(filter, el) {
  _activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProjects();
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const search = (document.getElementById('proj-search')?.value || '').toLowerCase();

  let list = STATE.projects;
  const empDomains = Array.isArray(STATE.employee.domains) && STATE.employee.domains.length > 0
    ? STATE.employee.domains
    : [STATE.employee.role].filter(Boolean);

  if (_activeFilter === 'my') {
    list = list.filter(p => isProjectAssignedTo(p, STATE.employee));
  } else if (_activeFilter !== 'all') {
    list = list.filter(p => {
      const s = p.status || '';
      if (_activeFilter === 'Assigned') return s === 'Assigned';
      if (_activeFilter === 'In Progress') return s === 'In Progress';
      if (_activeFilter === 'Completed') return s === 'Completed';
      if (_activeFilter === 'Review') return s === 'Review' || s === 'In Review';
      if (_activeFilter === 'Cancelled') return s === 'Cancelled';
      return true;
    });
  }

  if (search) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.client || '').toLowerCase().includes(search) ||
      (p.service || '').toLowerCase().includes(search) ||
      (p.assignedTo || '').toLowerCase().includes(search) ||
      (Array.isArray(p.assigned) && p.assigned.some(a => a.toLowerCase().includes(search)))
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="projects-empty">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <p>No deliverables match your search. Create one to get started!</p>
    </div>`;
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const deadlineWarning = (dl, status) => {
    if (!dl) return '<span class="proj-deadline">📅 Ongoing</span>';
    const isCompleted = status === 'Completed' || status === 'Cancelled';
    if (!isCompleted && dl < todayStr) {
      return `<span class="proj-deadline overdue" style="background:rgba(239,68,68,0.22);color:#ef4444;border:1px solid rgba(239,68,68,0.5);font-weight:700">⚠️ Pending (Due: ${dl})</span>`;
    }
    const d = new Date(dl);
    const diff = d - Date.now();
    const near = diff < 3 * 24 * 3600000 && diff > 0;
    return `<span class="proj-deadline ${near ? 'near' : ''}">📅 ${dl}</span>`;
  };

  const statusClass = (s) => s ? s.replace(/\s+/g, '-') : 'Assigned';

  grid.className = 'projects-list-wrap';
  grid.innerHTML = list.map(p => {
    const isActive = STATE.activeProjectTimer && STATE.activeProjectTimer.projectId === p.id;
    const liveElapsed = isActive ? (Date.now() - STATE.activeProjectTimer.startTime) : 0;
    const timeDisplay = isActive ? fmtHHMMSS(liveElapsed) : (p.totalTimeSpent ? fmtDuration(p.totalTimeSpent) : '0h 0m');
    const isPending = p.deadline && p.deadline < todayStr && p.status !== 'Completed' && p.status !== 'Cancelled';

    return `
      <div class="proj-list-row ${p.priority} ${isActive ? 'is-active' : ''} ${isPending ? 'is-pending-overdue' : ''}" 
           style="${isPending ? 'border:1px solid rgba(239,68,68,0.55);box-shadow:0 0 16px rgba(239,68,68,0.18);background:linear-gradient(90deg,rgba(239,68,68,0.06),transparent);' : ''}"
           onclick="openProjectDetail('${p.id}')" title="Click to open assignment details and logs">
        <div class="proj-row-left">
          <span class="proj-priority-dot ${p.priority}" title="${p.priority} Priority"></span>
          <div class="proj-row-title-box">
            <span class="proj-row-name">${p.name}</span>
            <span class="proj-row-client">🏢 ${p.client || 'Client'}</span>
            ${isPending ? `<span style="background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.4);border-radius:4px;font-size:10px;font-weight:800;padding:2px 6px;margin-top:3px;display:inline-block;width:fit-content;letter-spacing:0.5px">⚠️ PENDING ASSIGNMENT</span>` : ''}
          </div>
        </div>

        <div class="proj-row-center">
          <span class="stat-badge cyan" style="font-size:11.5px">🔧 ${p.service}</span>
          <div class="proj-row-assigned">
            ${(p.assigned || []).map(a => `<span class="proj-assign-pill">👤 ${a}</span>`).join('')}
          </div>
        </div>

        <div class="proj-row-right">
          ${deadlineWarning(p.deadline, p.status)}
          <span class="proj-status-pill ${statusClass(p.status)}">${p.status || 'Assigned'}</span>

          ${(p.status === 'Assigned') ? `
            <button class="btn-small" onclick="acceptDeliverable('${p.id}', event)" style="font-size:11px;padding:4px 10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:6px;font-weight:600;display:inline-flex;align-items:center;gap:4px;box-shadow:0 0 10px rgba(16,185,129,0.35);cursor:pointer;white-space:nowrap" title="Accept deliverable and start working">
              ✓ Accept
            </button>
          ` : ''}

          <div class="proj-timer-compact" onclick="event.stopPropagation()">
            <span class="proj-timer-time" id="proj-clock-${p.id}">${timeDisplay}</span>
            ${!isActive ? `
              <button class="btn-timer-icon start" onclick="startProjectWork('${p.id}')" title="Start Timer">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <span>${p.status === 'Assigned' ? 'Accept & Start' : 'Start'}</span>
              </button>
            ` : `
              <button class="btn-timer-icon stop" onclick="stopProjectWork('${p.id}')" title="Stop Timer">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
                <span>Stop</span>
              </button>
            `}
          </div>

          <span class="proj-row-chevron" title="Click to open deliverable details">›</span>
        </div>
      </div>
    `;
  }).join('');
}

function acceptDeliverable(id, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const p = STATE.projects.find(x => x.id === id);
  if (!p) return;
  p.status = 'In Progress';
  p.acceptedBy = STATE.employee.name;
  p.acceptedAt = Date.now();
  if (!p.assigned || !p.assigned.includes(STATE.employee.name)) {
    if (!Array.isArray(p.assigned)) p.assigned = [];
    p.assigned.push(STATE.employee.name);
  }
  p.assignedTo = p.assigned.join(', ');
  toast(`✓ Deliverable "${p.name}" accepted! You can now start tracking work. 🚀`, 'success');
  triggerConfetti();
  addActivity(`Accepted deliverable: ${p.name}`, 'green');
  save();
  renderProjects();
  if (STATE.viewingProjectId === id) {
    openProjectDetail(id);
  }
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.upsertProject(p);
  }
}

function openProjectDetail(id) {
  const p = STATE.projects.find(x => x.id === id);
  if (!p) return;
  STATE.viewingProjectId = id;

  document.getElementById('proj-detail-title').textContent = p.name;
  document.getElementById('proj-status-change').value = p.status || 'Assigned';

  const isActive = STATE.activeProjectTimer && STATE.activeProjectTimer.projectId === id;
  const liveElapsed = isActive ? (Date.now() - STATE.activeProjectTimer.startTime) : 0;
  const timeDisplay = isActive ? fmtHHMMSS(liveElapsed) : (p.totalTimeSpent ? fmtDuration(p.totalTimeSpent) : '0h 0m');

  const sessionsHtml = (p.sessions && p.sessions.length) ? `
    <div class="proj-session-history">
      <div class="proj-session-title">⏱ Work Sessions Log (${p.sessions.length})</div>
      <div class="session-chips-wrap">
        ${p.sessions.map(s => `
          <div class="session-chip">
            <strong>${s.date}</strong>: ${s.start} - ${s.end} (${s.durationStr})
          </div>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="proj-session-history">
      <div class="proj-session-title">⏱ Work Sessions Log</div>
      <div style="font-size:12px;color:var(--text-muted)">No recorded work sessions yet. Click "Start Work" to track billable time.</div>
    </div>
  `;

  document.getElementById('proj-detail-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Client Account</span>
        <span class="detail-val">${p.client || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Service Domain</span>
        <span class="detail-val">${p.service}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Priority Level</span>
        <span class="detail-val proj-priority-badge ${p.priority}">● ${p.priority}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Target Deadline</span>
        <span class="detail-val">${p.deadline || 'Flexible'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Assigned Specialists</span>
        <span class="detail-val">${(p.assigned || ['Me']).join(', ')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Total Time Tracked</span>
        <span class="detail-val" style="color:#34d399;font-weight:700" id="modal-proj-clock">${timeDisplay}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Date Created</span>
        <span class="detail-val">${fmtDate(p.createdAt)}</span>
      </div>
      ${p.desc ? `<div class="detail-desc">${p.desc}</div>` : ''}
    </div>
    ${sessionsHtml}
  `;

  const btnWrap = document.getElementById('proj-detail-timer-btn-wrap');
  if (btnWrap) {
    if (!isActive) {
      btnWrap.innerHTML = `
        ${(p.status === 'Assigned') ? `
          <button class="proj-timer-btn" onclick="acceptDeliverable('${p.id}');openProjectDetail('${p.id}')" style="background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;color:#fff;box-shadow:0 0 12px rgba(16,185,129,0.35)">
            <span>✓ Accept Deliverable</span>
          </button>
        ` : ''}
        <button class="proj-timer-btn btn-green" onclick="startProjectWork('${p.id}');openProjectDetail('${p.id}')">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          <span>${p.status === 'Assigned' ? 'Accept & Start Work' : 'Start Work'}</span>
        </button>
      `;
    } else {
      btnWrap.innerHTML = `
        <button class="proj-timer-btn btn-red" onclick="stopProjectWork('${p.id}');openProjectDetail('${p.id}')">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M6 6h12v12H6z" fill="currentColor"/></svg>
          <span>Stop Work</span>
        </button>
      `;
    }
  }

  openModal('proj-detail-modal');
}

function changeProjectStatus() {
  const id = STATE.viewingProjectId;
  const p = STATE.projects.find(x => x.id === id);
  if (!p) return;
  const newStatus = document.getElementById('proj-status-change').value;
  p.status = newStatus;
  if (newStatus === 'Completed') {
    p.completedAt = Date.now();
    p.completedDate = fmtDate(Date.now());
    p.completedBy = STATE.employee.name;
    if (Array.isArray(p.sessions)) {
      p.sessions = p.sessions.filter(s => !(s && s.isActive));
    }
    triggerConfetti();
  }
  renderProjects();
  addActivity(`Project "${p.name}" → ${newStatus}`, 'purple');
  toast(`Status updated: ${newStatus}`, 'success');
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.upsertProject(p);
  }
}

function deleteProject() {
  const id = STATE.viewingProjectId;
  if (!id) return;
  if (!confirm('Are you sure you want to delete this deliverable?')) return;
  if (STATE.activeProjectTimer && STATE.activeProjectTimer.projectId === id) {
    stopProjectWork(id, true);
  }
  STATE.projects = STATE.projects.filter(x => x.id !== id);
  renderProjects();
  updateDashCounts();
  closeModal('proj-detail-modal');
  toast('Deliverable deleted', 'info');
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.deleteProject(id);
  }
}

function clearAllProjects() {
  if (!confirm('Are you sure you want to remove all deliverables from your workspace?')) return;
  if (STATE.activeProjectTimer) {
    stopProjectWork(STATE.activeProjectTimer.projectId, true);
  }
  STATE.projects = [];
  updateDashCounts();
  renderProjects();
  save();
  toast('All deliverables cleared!', 'info');
}

function populateTimerSelect() {}

// ========================
// INLINE PROJECT WORK TIMER (GREEN START / RED STOP)
// ========================
let _projectTimerInterval = null;

function startProjectWork(id) {
  if (STATE.attendance.status !== 'in') {
    toast('⚠️ Please Punch Check-In in Attendance before starting work', 'error');
    return;
  }

  const proj = STATE.projects.find(p => p.id === id);
  if (!proj) return;

  // If another project is running, stop it and log its time first
  if (STATE.activeProjectTimer && STATE.activeProjectTimer.projectId !== id) {
    stopProjectWork(STATE.activeProjectTimer.projectId, true);
  }

  const now = Date.now();
  STATE.activeProjectTimer = {
    projectId: id,
    startTime: now,
  };

  if (proj.status === 'Assigned') {
    proj.status = 'In Progress';
    proj.acceptedBy = STATE.employee.name;
    proj.acceptedAt = now;
    if (!proj.assigned || !proj.assigned.includes(STATE.employee.name)) {
      if (!Array.isArray(proj.assigned)) proj.assigned = [];
      proj.assigned.push(STATE.employee.name);
    }
    proj.assignedTo = proj.assigned.join(', ');
  }

  // Active work indicator in sessions array for real-time executive admin pulse
  if (!Array.isArray(proj.sessions)) proj.sessions = [];
  proj.sessions = proj.sessions.filter(s => !(s && s.isActive && (s.userId === STATE.employee.id || s.user === STATE.employee.name)));
  proj.sessions.unshift({
    id: 'act_' + uid(),
    isActive: true,
    userId: STATE.employee.id,
    userName: STATE.employee.name,
    userRole: STATE.employee.role,
    projectId: proj.id,
    projectName: proj.name,
    date: fmtDate(now),
    start: fmt(now),
    startTime: now
  });

  updateProjectTimerTicker();
  renderProjects();
  syncActiveTaskTopbar();
  updateAdminKpis();
  renderAdminProjectsTime();
  renderAdminEmployees();
  addActivity(`Started work on: "${proj.name}"`, 'green');
  toast(`▶ Work session active on: ${proj.name}`, 'success');
  save();

  // Instant broadcast to Supabase Cloud so Admin immediately sees live work
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.upsertProject(proj);
  }
}

function stopProjectWork(id, isSwitching = false) {
  if (!STATE.activeProjectTimer || STATE.activeProjectTimer.projectId !== id) return;

  const duration = Math.max(0, Date.now() - STATE.activeProjectTimer.startTime);
  const proj = STATE.projects.find(p => p.id === id);

  if (proj) {
    proj.totalTimeSpent = (proj.totalTimeSpent || 0) + duration;
    if (!proj.sessions) proj.sessions = [];
    // Clear out active live session marker
    proj.sessions = proj.sessions.filter(s => !(s && s.isActive && (s.userId === STATE.employee.id || s.user === STATE.employee.name)));

    const session = {
      id: uid(),
      projectId: proj.id,
      projectName: proj.name,
      date: fmtDate(Date.now()),
      start: fmt(STATE.activeProjectTimer.startTime),
      end: fmt(Date.now()),
      durationMs: duration,
      durationStr: fmtDuration(duration),
      user: STATE.employee.name,
      userId: STATE.employee.id,
      completedToday: true,
      completedAt: Date.now()
    };
    proj.sessions.unshift(session);
    if (!STATE.timeLogs) STATE.timeLogs = [];
    STATE.timeLogs.unshift(session);

    if (!isSwitching) {
      toast(`⏹ Session logged: ${fmtDuration(duration)} on "${proj.name}"`, 'info');
      addActivity(`Logged ${fmtDuration(duration)} on "${proj.name}"`, 'purple');
    }
  }

  clearInterval(_projectTimerInterval);
  _projectTimerInterval = null;
  STATE.activeProjectTimer = null;

  renderProjects();
  syncActiveTaskTopbar();
  updateAdminKpis();
  renderAdminProjectsTime();
  renderAdminEmployees();
  if (STATE.viewingProjectId === id) {
    openProjectDetail(id);
  }
  save();
  if (typeof SupabaseData !== 'undefined' && proj) {
    SupabaseData.upsertProject(proj);
  }
}

function stopActiveProjectWork() {
  if (STATE.activeProjectTimer) {
    stopProjectWork(STATE.activeProjectTimer.projectId);
  }
}

function syncActiveTaskTopbar() {
  const bar = document.getElementById('topbar-active-task');
  const nameEl = document.getElementById('topbar-active-task-name');
  const timeEl = document.getElementById('topbar-active-task-timer');
  if (!bar) return;

  if (STATE.activeProjectTimer) {
    const proj = STATE.projects.find(p => p.id === STATE.activeProjectTimer.projectId);
    bar.style.display = 'flex';
    if (nameEl) nameEl.textContent = proj ? proj.name : 'Active Deliverable';
    const elapsed = Date.now() - STATE.activeProjectTimer.startTime;
    if (timeEl) timeEl.textContent = fmtHHMMSS(elapsed);
  } else {
    bar.style.display = 'none';
  }
}

function updateProjectTimerTicker() {
  clearInterval(_projectTimerInterval);
  if (!STATE.activeProjectTimer) return;

  _projectTimerInterval = setInterval(() => {
    if (!STATE.activeProjectTimer) {
      clearInterval(_projectTimerInterval);
      return;
    }
    const elapsed = Date.now() - STATE.activeProjectTimer.startTime;
    const digits = fmtHHMMSS(elapsed);

    // Update card timer clock if element exists
    const cardClock = document.getElementById(`proj-clock-${STATE.activeProjectTimer.projectId}`);
    if (cardClock) cardClock.textContent = digits;

    // Update topbar timer clock
    const topClock = document.getElementById('topbar-active-task-timer');
    if (topClock) topClock.textContent = digits;

    // Update modal timer clock if open
    const modalClock = document.getElementById('modal-proj-clock');
    if (modalClock) modalClock.textContent = digits;

    // Update admin timesheet clock if visible
    const adminClock = document.getElementById(`admin-timesheet-clock-${STATE.activeProjectTimer.projectId}`);
    if (adminClock) adminClock.textContent = digits;
  }, 1000);
}

// ========================
// SOCIAL MEDIA CALENDARS SYSTEM
// ========================
let _selectedCalendarFile = null;
let _calActiveFilter = 'all';

function formatMonthLabel(val) {
  if (!val) return 'Ongoing';
  if (val.includes('-')) {
    const parts = val.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return val;
}

function openCalendarUploadModal() {
  document.getElementById('cal-client-input').value = '';
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('cal-month-input').value = ym;
  document.getElementById('cal-title-input').value = '';
  document.getElementById('cal-notes-input').value = '';

  _selectedCalendarFile = null;
  const dropText = document.getElementById('cal-dropzone-text');
  const dropPill = document.getElementById('cal-dropzone-pill');
  if (dropText) dropText.style.display = 'flex';
  if (dropPill) {
    dropPill.style.display = 'none';
    dropPill.textContent = '';
  }
  const fileInput = document.getElementById('cal-pdf-file');
  if (fileInput) fileInput.value = '';

  openModal('calendar-upload-modal');
}

function handleCalendarFileSelect(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    toast('Please select a valid PDF file (.pdf)', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    _selectedCalendarFile = {
      name: file.name,
      sizeStr: Math.round(file.size / 1024) + ' KB',
      dataUrl: e.target.result,
    };
    const dropText = document.getElementById('cal-dropzone-text');
    const dropPill = document.getElementById('cal-dropzone-pill');
    if (dropText) dropText.style.display = 'none';
    if (dropPill) {
      dropPill.style.display = 'inline-block';
      dropPill.textContent = `✓ Selected: ${file.name} (${_selectedCalendarFile.sizeStr})`;
    }
    toast(`Loaded PDF: ${file.name}`, 'info');
  };
  reader.readAsDataURL(file);
}

function saveCalendarUpload() {
  const client = (document.getElementById('cal-client-input')?.value || '').trim();
  const monthVal = (document.getElementById('cal-month-input')?.value || '').trim();
  const title = (document.getElementById('cal-title-input')?.value || '').trim();
  const notes = (document.getElementById('cal-notes-input')?.value || '').trim();

  if (!client) {
    toast('Client name is required', 'error');
    return;
  }
  if (!monthVal) {
    toast('Please select month and year', 'error');
    return;
  }
  if (!title) {
    toast('Calendar title is required', 'error');
    return;
  }

  let fileName = 'Agency CRM.pdf';
  let fileUrl = 'Agency CRM.pdf';
  let fileSize = '62 KB';

  if (_selectedCalendarFile) {
    fileName = _selectedCalendarFile.name;
    fileUrl = _selectedCalendarFile.dataUrl;
    fileSize = _selectedCalendarFile.sizeStr;
  }

  const newCal = {
    id: uid(),
    client,
    month: monthVal,
    monthLabel: formatMonthLabel(monthVal),
    title,
    notes,
    fileName,
    fileUrl,
    fileSize,
    uploadedBy: STATE.employee.name,
    uploadedAt: Date.now(),
  };

  if (!Array.isArray(STATE.calendars)) STATE.calendars = [];
  STATE.calendars.unshift(newCal);

  updateCalendarCounts();
  renderCalendars();
  closeModal('calendar-upload-modal');
  triggerConfetti();
  addActivity(`Uploaded social media calendar for ${client} (${newCal.monthLabel})`, 'blue');
  toast(`Social media calendar for ${client} added!`, 'success');
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.upsertCalendar(newCal);
  }
}

function deleteCalendar(id) {
  const cal = (STATE.calendars || []).find(c => c.id === id);
  if (!cal) return;
  if (!confirm(`Are you sure you want to remove the calendar "${cal.title}" for ${cal.client}?`)) return;

  STATE.calendars = STATE.calendars.filter(c => c.id !== id);
  updateCalendarCounts();
  renderCalendars();
  addActivity(`Removed calendar: ${cal.title}`, 'orange');
  toast('Calendar PDF removed', 'info');
  save();
  if (typeof SupabaseData !== 'undefined') {
    SupabaseData.deleteCalendar(id);
  }
}

let _calSelectedClient = 'all';

function filterCalendarsByClient(client) {
  _calSelectedClient = client;
  renderCalendars();
}

function populateCalendarClientDropdown() {
  const select = document.getElementById('cal-client-select');
  if (!select) return;

  const currentVal = _calSelectedClient || 'all';
  const clientNames = new Set();
  (STATE.clients || []).forEach(c => c && c.name && clientNames.add(c.name.trim()));
  (STATE.calendars || []).forEach(c => c && c.client && clientNames.add(c.client.trim()));

  const sortedClients = Array.from(clientNames).sort();
  let html = `<option value="all" ${currentVal === 'all' ? 'selected' : ''}>🏢 All Client Calendars (${(STATE.calendars || []).length})</option>`;
  sortedClients.forEach(name => {
    const count = (STATE.calendars || []).filter(c => (c.client || '').toLowerCase() === name.toLowerCase()).length;
    html += `<option value="${name}" ${currentVal.toLowerCase() === name.toLowerCase() ? 'selected' : ''}>🏢 ${name} (${count})</option>`;
  });
  select.innerHTML = html;
}

function viewCalendarPDF(id) {
  const cal = (STATE.calendars || []).find(c => c.id === id);
  if (!cal) return;

  const modalTitle = document.getElementById('pdf-viewer-title');
  if (modalTitle) modalTitle.textContent = `${cal.client} — ${cal.title} (${cal.monthLabel || ''})`;

  const frame = document.getElementById('pdf-viewer-frame');
  const extLink = document.getElementById('pdf-viewer-external-link');
  const dloadLink = document.getElementById('pdf-viewer-download-link');

  if (frame) frame.src = cal.fileUrl;
  if (extLink) extLink.href = cal.fileUrl;
  if (dloadLink) {
    dloadLink.href = cal.fileUrl;
    dloadLink.download = cal.fileName || `${cal.client}-calendar.pdf`;
  }

  openModal('pdf-viewer-modal');
}

function filterCalendars(filter, el) {
  _calActiveFilter = filter;
  document.querySelectorAll('#cal-filter-chips .filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderCalendars();
}

function updateCalendarCounts() {
  const count = (STATE.calendars || []).length;
  const badge = document.getElementById('nav-cal-badge');
  if (badge) badge.textContent = count;
}

function renderCalendars() {
  const grid = document.getElementById('calendars-grid');
  if (!grid) return;

  populateCalendarClientDropdown();

  const search = (document.getElementById('cal-search')?.value || '').toLowerCase();
  let list = STATE.calendars || [];

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (_calActiveFilter === 'current') {
    list = list.filter(c => c.month === currentYM || (c.monthLabel && c.monthLabel.toLowerCase().includes('october 2026')));
  }

  if (_calSelectedClient && _calSelectedClient !== 'all') {
    list = list.filter(c => (c.client || '').toLowerCase() === _calSelectedClient.toLowerCase());
  }

  if (search) {
    list = list.filter(c =>
      (c.client || '').toLowerCase().includes(search) ||
      (c.title || '').toLowerCase().includes(search) ||
      (c.monthLabel || '').toLowerCase().includes(search) ||
      (c.fileName || '').toLowerCase().includes(search)
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="projects-empty" style="grid-column: 1 / -1; padding: 50px 20px;">
        <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 12px;opacity:0.35;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>
        <h4 style="color:#fff;margin-bottom:6px;font-size:16px;">No Content Calendars Found</h4>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:18px;">${_calSelectedClient !== 'all' ? `No calendar uploaded yet for "${_calSelectedClient}".` : 'Upload monthly client content calendar PDFs to keep the entire agency aligned.'}</p>
        <button class="btn-primary btn-glow" onclick="openCalendarUploadModal()" style="display:inline-flex;margin:0 auto;">
          <span>+ Upload Client Calendar</span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(c => `
    <div class="cal-card">
      <div>
        <div class="cal-card-top">
          <span class="cal-client-badge">🏢 ${c.client}</span>
          <span class="cal-month-tag">🗓️ ${c.monthLabel || c.month}</span>
        </div>

        <div class="cal-card-body">
          <div class="cal-pdf-icon-box">
            <svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>
            <span>PDF</span>
          </div>
          <div class="cal-info">
            <h4 class="cal-title">${c.title}</h4>
            <div class="cal-filename" title="${c.fileName}">${c.fileName}</div>
            <div class="cal-meta-row">
              <span>📦 ${c.fileSize || 'PDF'}</span>
              <span>•</span>
              <span>👤 ${c.uploadedBy || 'Team'}</span>
              <span>•</span>
              <span>🕒 ${fmtDate(c.uploadedAt)}</span>
            </div>
          </div>
        </div>

        ${c.notes ? `<div class="cal-notes">📝 ${c.notes}</div>` : ''}
      </div>

      <div class="cal-card-footer">
        <div class="cal-actions" style="flex-wrap:wrap;gap:6px">
          <button class="btn-cal-action view" onclick="viewCalendarPDF('${c.id}')" title="Preview PDF Inside Website">
            <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            <span>Website View</span>
          </button>
          <a class="btn-cal-action" href="${c.fileUrl}" target="_blank" title="Open PDF in New Browser Tab" style="display:inline-flex;align-items:center;gap:4px">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            <span>New Tab</span>
          </a>
          <a class="btn-cal-action download" href="${c.fileUrl}" download="${c.fileName}" title="Download PDF to Device">
            <svg viewBox="0 0 24 24" width="13" height="13"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            <span>Download</span>
          </a>
        </div>
        <button class="btn-cal-action delete" onclick="deleteCalendar('${c.id}')" title="Remove Calendar">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ========================
// AGENCY ADMIN COMMAND CENTER
// ========================

function renderAdminPanel() {
  updateAdminKpis();
  renderAdminClients();
  renderAdminEmployees();
  renderAdminProjectsTime();
  syncClientsDatalist();
}

function updateAdminKpis() {
  // 1. Client count
  const clientsCount = (STATE.clients || []).length;
  const kpiClients = document.getElementById('admin-kpi-clients');
  if (kpiClients) kpiClients.textContent = clientsCount;

  const tabClientCount = document.getElementById('admin-tab-client-count');
  if (tabClientCount) tabClientCount.textContent = clientsCount;

  // 2. Team roster & active checked-in count
  const teamList = STATE.team || [];
  const kpiTeam = document.getElementById('admin-kpi-team');
  if (kpiTeam) kpiTeam.textContent = teamList.length;

  const tabEmpCount = document.getElementById('admin-tab-emp-count');
  if (tabEmpCount) tabEmpCount.textContent = teamList.length;

  let activeCount = 0;
  teamList.forEach(m => {
    if (m.id === STATE.employee.id || m.isCurrent) {
      if (STATE.attendance.status === 'in') activeCount++;
    } else {
      if (m.id !== 'EMP-004' && m.id !== 'EMP-006') activeCount++;
    }
  });
  const kpiTeamActive = document.getElementById('admin-kpi-team-active');
  if (kpiTeamActive) kpiTeamActive.textContent = `${activeCount} in studio`;

  // 3. Content Calendars
  const calCount = (STATE.calendars || []).length;
  const kpiCals = document.getElementById('admin-kpi-cals');
  if (kpiCals) kpiCals.textContent = calCount;

  // 4. Active deliverables
  const activeProjects = (STATE.projects || []).filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').length;
  const kpiProjects = document.getElementById('admin-kpi-projects');
  if (kpiProjects) kpiProjects.textContent = activeProjects;

  const tabProjCount = document.getElementById('admin-tab-proj-count');
  if (tabProjCount) tabProjCount.textContent = (STATE.projects || []).length;
}

function switchAdminTab(tabName, el) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  const panes = {
    clients: document.getElementById('admin-pane-clients'),
    employees: document.getElementById('admin-pane-employees'),
    timesheets: document.getElementById('admin-pane-timesheets'),
  };

  Object.keys(panes).forEach(k => {
    if (panes[k]) panes[k].style.display = (k === tabName) ? 'block' : 'none';
  });

  if (tabName === 'clients') renderAdminClients();
  if (tabName === 'employees') renderAdminEmployees();
  if (tabName === 'timesheets') renderAdminProjectsTime();
}

function syncClientsDatalist() {
  const dl = document.getElementById('clients-datalist');
  if (!dl) return;

  const clientNames = new Set();
  (STATE.clients || []).forEach(c => c.name && clientNames.add(c.name.trim()));
  (STATE.projects || []).forEach(p => p.client && clientNames.add(p.client.trim()));
  (STATE.calendars || []).forEach(cal => cal.client && clientNames.add(cal.client.trim()));

  dl.innerHTML = Array.from(clientNames).map(name => `<option value="${name}">`).join('');
}

function renderAdminClients() {
  const tbody = document.getElementById('admin-clients-tbody');
  if (!tbody) return;

  const search = (document.getElementById('admin-client-search')?.value || '').toLowerCase();
  let list = STATE.clients || [];

  if (search) {
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(search) ||
      (c.industry || '').toLowerCase().includes(search) ||
      (c.lead || '').toLowerCase().includes(search) ||
      (c.status || '').toLowerCase().includes(search)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px 20px;color:var(--text-muted)">
          <div style="font-size:32px;margin-bottom:8px">🏢</div>
          <strong style="color:#fff;display:block;margin-bottom:6px">No Clients Found</strong>
          <p style="font-size:12.5px;margin-bottom:14px">No client account matches your search criteria.</p>
          <button class="btn-primary btn-small" onclick="openAddClientModal()">+ Add Client Account</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(c => {
    const clientProjects = (STATE.projects || []).filter(p => (p.client || '').toLowerCase() === (c.name || '').toLowerCase());
    const clientCals = (STATE.calendars || []).filter(cal => (cal.client || '').toLowerCase() === (c.name || '').toLowerCase());
    const statusBadgeClass = c.status === 'Active' ? 'green' : (c.status === 'On Hold' ? 'orange' : 'purple');

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--violet-400)">
              ${c.name ? c.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <strong style="color:#fff;font-size:14px;display:block">${c.name}</strong>
              <span style="color:var(--text-muted);font-size:11.5px">${c.lead ? 'Lead: ' + c.lead : 'Client Account'}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#cbd5e1">
            <span>🏷️</span> ${c.industry || 'General Digital'}
          </span>
        </td>
        <td>
          <span class="stat-badge cyan" style="font-size:11.5px;padding:3px 9px;">
            📁 ${clientProjects.length} ${clientProjects.length === 1 ? 'Project' : 'Projects'}
          </span>
        </td>
        <td>
          <span class="stat-badge purple" style="font-size:11.5px;padding:3px 9px;">
            🗓️ ${clientCals.length} ${clientCals.length === 1 ? 'Calendar' : 'Calendars'}
          </span>
        </td>
        <td>
          <span class="stat-badge ${statusBadgeClass}" style="font-size:11.5px;padding:3px 9px;">
            ${c.status || 'Active'}
          </span>
        </td>
        <td style="text-align:right">
          <button class="btn-icon danger" onclick="deleteClient('${c.id}')" title="Delete Client Account" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--rose-400);width:32px;height:32px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddClientModal() {
  document.getElementById('new-client-name').value = '';
  document.getElementById('new-client-industry').value = '';
  document.getElementById('new-client-status').value = 'Active';
  document.getElementById('new-client-lead').value = STATE.employee.name ? `${STATE.employee.name} (${STATE.employee.role})` : '';
  document.getElementById('new-client-notes').value = '';
  openModal('client-add-modal');
}

function saveNewClient() {
  const name = (document.getElementById('new-client-name')?.value || '').trim();
  if (!name) {
    toast('⚠️ Please enter a client or brand name', 'error');
    return;
  }

  const exists = (STATE.clients || []).some(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    toast('⚠️ A client with this name already exists in the directory', 'error');
    return;
  }

  const industry = (document.getElementById('new-client-industry')?.value || '').trim() || 'Digital Marketing & Media';
  const status = document.getElementById('new-client-status')?.value || 'Active';
  const lead = (document.getElementById('new-client-lead')?.value || '').trim() || 'Amaan Khan (Owner)';
  const notes = (document.getElementById('new-client-notes')?.value || '').trim();

  const newClient = {
    id: 'c-' + uid(),
    name,
    industry,
    status,
    lead,
    notes,
    createdAt: Date.now(),
  };

  if (!STATE.clients) STATE.clients = [];
  STATE.clients.unshift(newClient);

  save();
  closeModal('client-add-modal');
  renderAdminPanel();
  addActivity(`Admin added new client: "${name}"`, 'purple');
  toast(`Client "${name}" added to Admin Directory! 🎉`, 'success');
}

function deleteClient(id) {
  const client = (STATE.clients || []).find(c => c.id === id);
  if (!client) return;

  if (!confirm(`Are you sure you want to remove client "${client.name}" from the admin directory?`)) {
    return;
  }

  STATE.clients = STATE.clients.filter(c => c.id !== id);
  save();
  renderAdminPanel();
  addActivity(`Admin removed client: "${client.name}"`, 'orange');
  toast(`Client "${client.name}" removed`, 'info');
}

function renderAdminEmployees() {
  const grid = document.getElementById('admin-roster-grid');
  if (!grid) return;

  const search = (document.getElementById('admin-emp-search')?.value || '').toLowerCase();
  
  // Only display HIRED STAFF in roster (Founder Amaan Khan is Executive Owner)
  let list = (STATE.team || []).filter(m => !m.isFounder && m.id !== 'EMP-000');

  if (search) {
    list = list.filter(m =>
      (m.name || '').toLowerCase().includes(search) ||
      (m.role || '').toLowerCase().includes(search) ||
      (m.id || '').toLowerCase().includes(search)
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="projects-empty" style="grid-column: 1 / -1; padding: 45px 20px; text-align: center;">
        <div style="font-size:38px;margin-bottom:10px">👥</div>
        <h4 style="color:#fff;margin-bottom:6px;font-size:16px">${search ? 'No Staff Matches Found' : 'No Staff Members Added Yet'}</h4>
        <p style="color:var(--text-muted);font-size:12.5px;margin-bottom:16px;max-width:440px;margin-left:auto;margin-right:auto">
          ${search ? 'No hired staff member matched your search query.' : 'Amaan Khan is the Agency Owner. Recruited employees (video editors, designers, thumbnail artists) will appear here.'}
        </p>
        <button class="btn-primary btn-small" onclick="openAddEmployeeModal()">+ Add Team Member</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(m => {
    const isCurrent = (m.id === STATE.employee.id || m.isCurrent);
    const roleObj = DOMAIN_ROLES.find(r => r.label === m.role) || { icon: '💼' };
    const initials = computeInitials(m.name);

    let statusDotColor = 'var(--emerald-400)';
    let statusLabel = 'In Studio';

    if (isCurrent) {
      if (STATE.attendance.status === 'in') {
        statusDotColor = 'var(--emerald-400)';
        statusLabel = 'In Studio';
      } else if (STATE.attendance.status === 'lunch') {
        statusDotColor = 'var(--amber-400)';
        statusLabel = 'Lunch Break';
      } else if (STATE.attendance.status === 'done') {
        statusDotColor = 'var(--violet-400)';
        statusLabel = 'Shift Done';
      } else {
        statusDotColor = 'var(--slate-500)';
        statusLabel = 'Offline';
      }
    } else {
      if (m.id === 'EMP-004') {
        statusDotColor = 'var(--amber-400)';
        statusLabel = 'Lunch Break';
      } else if (m.id === 'EMP-006') {
        statusDotColor = 'var(--slate-500)';
        statusLabel = 'Offline';
      } else {
        statusDotColor = 'var(--emerald-400)';
        statusLabel = 'In Studio';
      }
    }

    let activeTaskHtml = '';
    if (isCurrent && STATE.activeProjectTimer) {
      const activeProj = (STATE.projects || []).find(p => p.id === STATE.activeProjectTimer.projectId);
      const pName = activeProj ? activeProj.name : 'Active Deliverable';
      activeTaskHtml = `
        <div class="admin-emp-active-task running">
          <span class="timer-pulse-circle"></span>
          <span>Live: <strong>${pName}</strong></span>
        </div>
      `;
    } else if (isCurrent) {
      const assignedProj = (STATE.projects || []).find(p => (p.assignedTo || '').includes(m.name) && p.status !== 'Completed');
      if (assignedProj) {
        activeTaskHtml = `
          <div class="admin-emp-active-task">
            <span>🎯 Assigned: <strong>${assignedProj.name}</strong></span>
          </div>
        `;
      } else {
        activeTaskHtml = `
          <div class="admin-emp-active-task">
            <span>✨ Available for new deliverables</span>
          </div>
        `;
      }
    } else {
      const assignedProj = (STATE.projects || []).find(p => (p.assignedTo || '').includes(m.name) || (p.serviceDomain === m.role));
      if (assignedProj) {
        activeTaskHtml = `
          <div class="admin-emp-active-task">
            <span>🎯 Assigned: <strong>${assignedProj.name}</strong></span>
          </div>
        `;
      } else {
        activeTaskHtml = `
          <div class="admin-emp-active-task">
            <span>✨ Active in studio</span>
          </div>
        `;
      }
    }

    let hoursStr = '0h 0m';
    if (isCurrent) {
      if (STATE.attendance.checkInTime) {
        const elapsed = (STATE.attendance.status === 'done' && STATE.attendance.checkOutTime)
          ? (STATE.attendance.checkOutTime - STATE.attendance.checkInTime)
          : (Date.now() - STATE.attendance.checkInTime);
        hoursStr = fmtDuration(elapsed);
      }
    } else {
      hoursStr = m.isFounder ? '7h 15m' : (m.id === 'EMP-006' ? '0h 0m' : '5h 40m');
    }

    const empDomains = Array.isArray(m.domains) && m.domains.length > 0
      ? m.domains
      : (m.role ? String(m.role).split(',').map(s => s.trim()) : ['Video Editor']);
    const domainBadges = empDomains.map(d => `<span class="domain-badge" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);color:#c4b5fd;border-radius:12px;font-size:11px;font-weight:600;margin:2px 3px 2px 0">${d}</span>`).join('');

    return `
      <div class="proj-list-row clickable-row" onclick="typeof openAdminEmpDetail === 'function' ? openAdminEmpDetail('${m.id}') : null" title="Click to view specialist details">
        <div class="proj-row-left">
          <div style="position:relative;width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,rgba(124,58,237,0.3),rgba(6,182,212,0.2));border:1px solid rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">
            ${initials}
            <span style="position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${statusDotColor};border:2px solid #0f172a"></span>
          </div>
          <div class="proj-row-title-box">
            <span class="proj-row-name">${m.name} ${m.isFounder ? '👑 Founder' : (isCurrent ? '✨ You' : '')}</span>
            <span class="proj-row-client">${m.id} • ${m.shift || '10:00 AM – 07:00 PM'}</span>
          </div>
        </div>

        <div class="proj-row-center">
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${domainBadges}
          </div>
        </div>

        <div class="proj-row-right">
          <span class="stat-badge green" style="font-size:11px;padding:2px 8px">● ${statusLabel}</span>
          <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">${hoursStr}</span>
          ${m.isFounder ? '' : `
            <button class="btn-icon danger" onclick="event.stopPropagation(); deleteEmployee('${m.id}')" title="Remove Member" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--rose-400);width:28px;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          `}
          <span class="proj-row-chevron" title="Click to view">›</span>
        </div>
      </div>
    `;
  }).join('');
}

function openAddEmployeeModal() {
  document.getElementById('new-emp-name').value = '';
  const hired = (STATE.team || []).filter(m => !m.isFounder && m.id !== 'EMP-000');
  const nextNum = hired.length + 1;
  const formattedNum = nextNum < 10 ? `00${nextNum}` : (nextNum < 100 ? `0${nextNum}` : nextNum);
  document.getElementById('new-emp-id').value = `EMP-${formattedNum}`;
  document.getElementById('new-emp-role').value = 'Video Editor';
  document.getElementById('new-emp-shift').value = '10:00 AM – 07:00 PM';
  const passInput = document.getElementById('new-emp-pass');
  if (passInput) passInput.value = '123';
  openModal('employee-add-modal');
}

function saveNewEmployee() {
  const name = (document.getElementById('new-emp-name')?.value || '').trim();
  const id = (document.getElementById('new-emp-id')?.value || '').trim();
  const role = document.getElementById('new-emp-role')?.value || 'Video Editor';
  const shift = (document.getElementById('new-emp-shift')?.value || '').trim() || '10:00 AM – 07:00 PM';
  const password = (document.getElementById('new-emp-pass')?.value || '').trim() || '123';

  if (!name) {
    toast('⚠️ Please enter team member full name', 'error');
    return;
  }
  if (!id) {
    toast('⚠️ Please enter an employee ID', 'error');
    return;
  }

  if ((STATE.team || []).some(m => m.id.toLowerCase() === id.toLowerCase())) {
    toast(`⚠️ Employee ID "${id}" is already assigned to a team member`, 'error');
    return;
  }

  const newEmp = {
    id,
    name,
    role,
    shift,
    password,
    addedAt: Date.now(),
  };

  if (!STATE.team) STATE.team = [];
  STATE.team.push(newEmp);

  save();
  closeModal('employee-add-modal');
  renderAdminPanel();
  addActivity(`Admin added team member: ${name} (${role}) with password`, 'purple');
  toast(`Team member ${name} (${id}) added to Roster! 🎉`, 'success');
}

function deleteEmployee(id) {
  if (id === 'EMP-000') {
    toast('❌ Cannot remove Agency Founder Amaan Khan', 'error');
    return;
  }

  const emp = (STATE.team || []).find(m => m.id === id);
  if (!emp) return;

  if (!confirm(`Are you sure you want to remove ${emp.name} (${emp.id} - ${emp.role}) from the team roster?`)) {
    return;
  }

  STATE.team = STATE.team.filter(m => m.id !== id);
  save();
  renderAdminPanel();
  addActivity(`Admin removed team member: ${emp.name}`, 'orange');
  toast(`Team member ${emp.name} removed from roster`, 'info');
}

function renderAdminProjectsTime() {
  const tbody = document.getElementById('admin-timesheets-tbody');
  if (!tbody) return;

  const search = (document.getElementById('admin-timesheet-search')?.value || '').toLowerCase();
  let list = STATE.projects || [];

  if (search) {
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(search) ||
      (p.client || '').toLowerCase().includes(search) ||
      (p.serviceDomain || '').toLowerCase().includes(search) ||
      (p.status || '').toLowerCase().includes(search) ||
      (p.assignedTo || '').toLowerCase().includes(search)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:40px 20px;color:var(--text-muted)">
          <div style="font-size:32px;margin-bottom:8px">⏱️</div>
          <strong style="color:#fff;display:block;margin-bottom:6px">No Deliverables or Timesheets Found</strong>
          <p style="font-size:12.5px;margin-bottom:14px">Projects created with start/stop timers will show their accumulated tracked hours here.</p>
          <button class="btn-primary btn-small" onclick="openNewProjectModal()">+ Create Deliverable</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const isLive = STATE.activeProjectTimer && STATE.activeProjectTimer.projectId === p.id;
    let liveElapsed = 0;
    if (isLive) {
      liveElapsed = Math.max(0, Date.now() - STATE.activeProjectTimer.startTime);
    }
    const totalMs = (p.totalTimeSpent || 0) + liveElapsed;
    const sessionCount = p.sessions ? p.sessions.length : 0;

    let liveStateBadge = '';
    if (isLive) {
      liveStateBadge = `
        <span class="timer-live-badge">
          <span class="timer-pulse-circle"></span> RUNNING NOW
        </span>
        <span id="admin-timesheet-clock-${p.id}" class="timesheet-clock" style="font-family:var(--font-mono);font-size:11.5px;color:#34d399;font-weight:700;margin-left:6px">
          ${fmtHHMMSS(liveElapsed)}
        </span>
      `;
    } else if (p.status === 'Completed') {
      liveStateBadge = `<span class="stat-badge green" style="font-size:11px;padding:3px 8px">✅ Completed</span>`;
    } else {
      liveStateBadge = `<span class="stat-badge purple" style="font-size:11px;padding:3px 8px">⏸️ Standby</span>`;
    }

    return `
      <tr>
        <td>
          <strong style="color:#fff;font-size:13.5px;display:block">${p.name}</strong>
          <span style="font-size:11px;color:var(--text-muted)">Assigned to: ${p.assignedTo || 'Unassigned'}</span>
        </td>
        <td>
          <span class="stat-badge cyan" style="font-size:11.5px;padding:3px 8px">🏢 ${p.client || 'Internal'}</span>
        </td>
        <td>
          <span style="font-size:12px;color:#cbd5e1">🎨 ${p.serviceDomain || 'Video Editing'}</span>
        </td>
        <td>
          <span class="stat-badge ${p.status === 'Completed' ? 'green' : (p.status === 'In Progress' ? 'cyan' : 'orange')}" style="font-size:11px;padding:3px 8px">
            ${p.status}
          </span>
        </td>
        <td>
          <strong style="color:var(--emerald-400);font-size:13.5px;font-family:var(--font-mono)">${fmtDuration(totalMs)}</strong>
        </td>
        <td>
          <span style="font-size:12px;color:var(--text-muted)">${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}</span>
        </td>
        <td>
          <div style="display:flex;align-items:center">
            ${liveStateBadge}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ========================
// AMBIENT FOCUS AUDIO STUDIO (10 PROCEDURAL SOUNDSCAPES)
// ========================
let _audioMasterGain = null;
let _activeSoundNodes = [];
let _activeSoundIntervals = [];
let _currentSoundId = 'rain';

const FOCUS_SOUND_NAMES = {
  rain: '🌧️ Gentle Studio Rain',
  waves: '🌊 Deep Ocean Surf',
  cafe: '☕ Cozy Creative Cafe',
  alpha: '🧠 Alpha Waves (10Hz)',
  theta: '🧘 Theta Meditation (6Hz)',
  forest: '🌲 Forest Breeze & Pines',
  space: '🌌 Deep Space Drone',
  fire: '🔥 Fireplace Crackle',
  white: '💨 Studio White Noise',
  lofi: '🪟 Lo-Fi Vinyl Night Rain'
};

function initAudioContext() {
  if (!_audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    _audioCtx = new AudioContextClass();
    _audioMasterGain = _audioCtx.createGain();
    _audioMasterGain.gain.setValueAtTime(0.75, _audioCtx.currentTime);
    _audioMasterGain.connect(_audioCtx.destination);
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
}

function stopCurrentSound() {
  _activeSoundIntervals.forEach(id => clearInterval(id));
  _activeSoundIntervals = [];

  _activeSoundNodes.forEach(node => {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch (e) {}
  });
  _activeSoundNodes = [];
}

function getNoiseBuffer(ctx, seconds, type) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
  } else if (type === 'brown') {
    let lastOut = 0.0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 0.35;
    }
  } else {
    // white
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.035;
    }
  }
  return buffer;
}

function startSoundEngine(type) {
  stopCurrentSound();
  initAudioContext();
  const ctx = _audioCtx;
  const now = ctx.currentTime;

  const soundGain = ctx.createGain();
  soundGain.gain.setValueAtTime(0.001, now);
  soundGain.gain.exponentialRampToValueAtTime(1.0, now + 0.3);
  soundGain.connect(_audioMasterGain);
  _activeSoundNodes.push(soundGain);

  if (type === 'rain') {
    // 1. 🌧️ Gentle Studio Rain
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 3, 'pink');
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(160, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(soundGain);

    lfo.start(now);
    noise.start(now);
    _activeSoundNodes.push(noise, filter, lfo, lfoGain);

  } else if (type === 'waves') {
    // 2. 🌊 Deep Ocean Surf
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 4, 'brown');
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.125, now);
    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.setValueAtTime(260, now);
    lfo.connect(lfoFilterGain);
    lfoFilterGain.connect(filter.frequency);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.7, now);
    const lfoVolGain = ctx.createGain();
    lfoVolGain.gain.setValueAtTime(0.3, now);
    lfo.connect(lfoVolGain);
    lfoVolGain.connect(waveGain.gain);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(soundGain);

    lfo.start(now);
    noise.start(now);
    _activeSoundNodes.push(noise, filter, waveGain, lfo, lfoFilterGain, lfoVolGain);

  } else if (type === 'cafe') {
    // 3. ☕ Cozy Creative Cafe
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 3, 'pink');
    noise.loop = true;

    const band1 = ctx.createBiquadFilter();
    band1.type = 'bandpass';
    band1.frequency.setValueAtTime(450, now);
    band1.Q.setValueAtTime(1.5, now);

    const roomHum = ctx.createOscillator();
    roomHum.type = 'sine';
    roomHum.frequency.setValueAtTime(60, now);
    const roomHumGain = ctx.createGain();
    roomHumGain.gain.setValueAtTime(0.04, now);
    roomHum.connect(roomHumGain);
    roomHumGain.connect(soundGain);
    roomHum.start(now);

    noise.connect(band1);
    band1.connect(soundGain);
    noise.start(now);
    _activeSoundNodes.push(noise, band1, roomHum, roomHumGain);

    const chimeTimer = setInterval(() => {
      if (!STATE.audioPlaying) return;
      try {
        const chime = ctx.createOscillator();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(2100 + Math.random() * 400, ctx.currentTime);
        const chimeGain = ctx.createGain();
        chimeGain.gain.setValueAtTime(0.012, ctx.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        chime.connect(chimeGain);
        chimeGain.connect(soundGain);
        chime.start();
        chime.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }, 4500);
    _activeSoundIntervals.push(chimeTimer);

  } else if (type === 'alpha') {
    // 4. 🧠 Alpha Waves (10 Hz Binaural Beats - 200Hz L / 210Hz R)
    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(200, now);

    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(210, now);

    const merger = ctx.createChannelMerger(2);
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);

    const binauralGain = ctx.createGain();
    binauralGain.gain.setValueAtTime(0.18, now);
    merger.connect(binauralGain);
    binauralGain.connect(soundGain);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 2, 'pink');
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(soundGain);

    oscL.start(now);
    oscR.start(now);
    noise.start(now);
    _activeSoundNodes.push(oscL, oscR, merger, binauralGain, noise, noiseFilter, noiseGain);

  } else if (type === 'theta') {
    // 5. 🧘 Theta Meditation (6 Hz Binaural - 150Hz L / 156Hz R)
    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(150, now);

    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(156, now);

    const merger = ctx.createChannelMerger(2);
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);

    const thetaGain = ctx.createGain();
    thetaGain.gain.setValueAtTime(0.2, now);
    merger.connect(thetaGain);
    thetaGain.connect(soundGain);

    const drone = ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.setValueAtTime(75, now);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.08, now);
    drone.connect(droneGain);
    droneGain.connect(soundGain);

    oscL.start(now);
    oscR.start(now);
    drone.start(now);
    _activeSoundNodes.push(oscL, oscR, merger, thetaGain, drone, droneGain);

  } else if (type === 'forest') {
    // 6. 🌲 Forest Breeze & Pines
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 3, 'pink');
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(2.2, now);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(320, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(soundGain);

    lfo.start(now);
    noise.start(now);
    _activeSoundNodes.push(noise, filter, lfo, lfoGain);

    const birdTimer = setInterval(() => {
      if (!STATE.audioPlaying) return;
      try {
        const bird = ctx.createOscillator();
        bird.type = 'sine';
        bird.frequency.setValueAtTime(2800, ctx.currentTime);
        bird.frequency.exponentialRampToValueAtTime(3300, ctx.currentTime + 0.12);
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.015, ctx.currentTime);
        bGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        bird.connect(bGain);
        bGain.connect(soundGain);
        bird.start();
        bird.stop(ctx.currentTime + 0.2);
      } catch (e) {}
    }, 6000);
    _activeSoundIntervals.push(birdTimer);

  } else if (type === 'space') {
    // 7. 🌌 Deep Space Drone
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(55, now);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(55.35, now);
    const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.setValueAtTime(110, now);
    const o4 = ctx.createOscillator(); o4.type = 'sine'; o4.frequency.setValueAtTime(164.8, now);

    const spaceFilter = ctx.createBiquadFilter();
    spaceFilter.type = 'lowpass';
    spaceFilter.frequency.setValueAtTime(350, now);
    spaceFilter.Q.setValueAtTime(3.5, now);

    const spaceLfo = ctx.createOscillator();
    spaceLfo.frequency.setValueAtTime(0.06, now);
    const spaceLfoGain = ctx.createGain();
    spaceLfoGain.gain.setValueAtTime(160, now);
    spaceLfo.connect(spaceLfoGain);
    spaceLfoGain.connect(spaceFilter.frequency);

    const synthGain = ctx.createGain();
    synthGain.gain.setValueAtTime(0.12, now);

    o1.connect(spaceFilter);
    o2.connect(spaceFilter);
    o3.connect(spaceFilter);
    o4.connect(spaceFilter);
    spaceFilter.connect(synthGain);
    synthGain.connect(soundGain);

    o1.start(now); o2.start(now); o3.start(now); o4.start(now); spaceLfo.start(now);
    _activeSoundNodes.push(o1, o2, o3, o4, spaceFilter, spaceLfo, spaceLfoGain, synthGain);

  } else if (type === 'fire') {
    // 8. 🔥 Fireplace Crackle
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 2, 'brown');
    noise.loop = true;

    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.setValueAtTime(180, now);

    noise.connect(rumble);
    rumble.connect(soundGain);
    noise.start(now);
    _activeSoundNodes.push(noise, rumble);

    const fireCrackleTimer = setInterval(() => {
      if (!STATE.audioPlaying) return;
      try {
        const popCount = 1 + Math.floor(Math.random() * 3);
        for (let p = 0; p < popCount; p++) {
          const delay = Math.random() * 0.15;
          const pop = ctx.createBufferSource();
          const pBuffer = ctx.createBuffer(1, 300, ctx.sampleRate);
          const pData = pBuffer.getChannelData(0);
          for (let i = 0; i < 300; i++) pData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 40);
          pop.buffer = pBuffer;

          const pFilter = ctx.createBiquadFilter();
          pFilter.type = 'highpass';
          pFilter.frequency.setValueAtTime(1200 + Math.random() * 2500, ctx.currentTime + delay);

          const pGain = ctx.createGain();
          pGain.gain.setValueAtTime(0.04 + Math.random() * 0.04, ctx.currentTime + delay);

          pop.connect(pFilter);
          pFilter.connect(pGain);
          pGain.connect(soundGain);
          pop.start(ctx.currentTime + delay);
        }
      } catch (e) {}
    }, 380);
    _activeSoundIntervals.push(fireCrackleTimer);

  } else if (type === 'white') {
    // 9. 💨 Studio White Noise
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 2, 'white');
    noise.loop = true;

    const smoothFilter = ctx.createBiquadFilter();
    smoothFilter.type = 'lowpass';
    smoothFilter.frequency.setValueAtTime(4200, now);

    const wGain = ctx.createGain();
    wGain.gain.setValueAtTime(0.7, now);

    noise.connect(smoothFilter);
    smoothFilter.connect(wGain);
    wGain.connect(soundGain);
    noise.start(now);
    _activeSoundNodes.push(noise, smoothFilter, wGain);

  } else if (type === 'lofi') {
    // 10. 🪟 Lo-Fi Vinyl Night Rain
    const rain = ctx.createBufferSource();
    rain.buffer = getNoiseBuffer(ctx, 2, 'pink');
    rain.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(620, now);

    const vinylNoise = ctx.createBufferSource();
    vinylNoise.buffer = getNoiseBuffer(ctx, 1, 'white');
    vinylNoise.loop = true;
    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'highpass';
    vinylFilter.frequency.setValueAtTime(2500, now);
    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.06, now);

    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(50, now);
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.025, now);

    rain.connect(rainFilter);
    rainFilter.connect(soundGain);

    vinylNoise.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(soundGain);

    hum.connect(humGain);
    humGain.connect(soundGain);

    rain.start(now);
    vinylNoise.start(now);
    hum.start(now);
    _activeSoundNodes.push(rain, rainFilter, vinylNoise, vinylFilter, vinylGain, hum, humGain);
  }
}

function toggleAmbientAudio() {
  const btn = document.getElementById('ambient-audio-btn');
  const txt = document.getElementById('audio-btn-txt');
  const capsule = document.getElementById('focus-audio-capsule');
  const select = document.getElementById('focus-sound-select');

  if (!STATE.audioPlaying) {
    try {
      const selected = select ? select.value : (_currentSoundId || 'rain');
      _currentSoundId = selected;
      startSoundEngine(_currentSoundId);
      STATE.audioPlaying = true;
      if (btn) btn.classList.add('active');
      if (capsule) capsule.classList.add('active');
      if (txt) txt.textContent = 'Playing 🎧';
      toast(`Playing ${FOCUS_SOUND_NAMES[_currentSoundId] || 'Focus Sound'}`, 'info');
    } catch (e) {
      console.warn('Audio start error:', e);
      toast('Could not start audio context in this browser', 'error');
    }
  } else {
    stopCurrentSound();
    if (_audioCtx) {
      try { _audioCtx.close(); } catch (e) {}
      _audioCtx = null;
    }
    STATE.audioPlaying = false;
    if (btn) btn.classList.remove('active');
    if (capsule) capsule.classList.remove('active');
    if (txt) txt.textContent = 'Focus Audio';
    toast('Focus Sound paused', 'info');
  }
}

function changeFocusSound(newSoundId) {
  _currentSoundId = newSoundId;
  const btn = document.getElementById('ambient-audio-btn');
  const txt = document.getElementById('audio-btn-txt');
  const capsule = document.getElementById('focus-audio-capsule');

  if (STATE.audioPlaying) {
    try {
      startSoundEngine(_currentSoundId);
      toast(`Switched to ${FOCUS_SOUND_NAMES[_currentSoundId]}`, 'info');
    } catch (e) {
      console.warn('Sound switch error:', e);
    }
  } else {
    // Auto-start playing selected sound
    try {
      startSoundEngine(_currentSoundId);
      STATE.audioPlaying = true;
      if (btn) btn.classList.add('active');
      if (capsule) capsule.classList.add('active');
      if (txt) txt.textContent = 'Playing 🎧';
      toast(`Started ${FOCUS_SOUND_NAMES[_currentSoundId]}`, 'info');
    } catch (e) {
      console.warn('Sound auto-start error:', e);
    }
  }
}

// ========================
// CELEBRATION CONFETTI ENGINE
// ========================
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#fb7185', '#ffffff'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() * 200 - 100),
      y: canvas.height / 3 + (Math.random() * 100 - 50),
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.alpha -= 0.015;
      p.rotation += p.vRot;

      if (p.alpha > 0) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (active) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(frame);
}

// ========================
// DASHBOARD STATS & ACTIVITY
// ========================
function updateDashCounts() {
  const empDomains = Array.isArray(STATE.employee.domains) && STATE.employee.domains.length > 0
    ? STATE.employee.domains
    : [STATE.employee.role].filter(Boolean);

  const myProjects = (STATE.projects || []).filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return false;
    return isProjectAssignedTo(p, STATE.employee);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingProjects = myProjects.filter(p => p.deadline && p.deadline < todayStr);

  const countEl = document.getElementById('dash-proj-count');
  if (countEl) countEl.textContent = myProjects.length;

  const pendingCountEl = document.getElementById('dash-pending-count');
  if (pendingCountEl) {
    pendingCountEl.textContent = pendingProjects.length;
    pendingCountEl.style.color = pendingProjects.length > 0 ? '#ef4444' : '#10b981';
  }

  const pendingBadgeEl = document.getElementById('dash-pending-badge');
  if (pendingBadgeEl) {
    if (pendingProjects.length > 0) {
      pendingBadgeEl.textContent = `⚠️ ${pendingProjects.length} Overdue`;
      pendingBadgeEl.style.background = 'rgba(239,68,68,0.2)';
      pendingBadgeEl.style.color = '#ef4444';
      pendingBadgeEl.style.borderColor = 'rgba(239,68,68,0.4)';
    } else {
      pendingBadgeEl.textContent = '✓ On Track';
      pendingBadgeEl.style.background = 'rgba(16,185,129,0.15)';
      pendingBadgeEl.style.color = '#34d399';
      pendingBadgeEl.style.borderColor = 'rgba(16,185,129,0.3)';
    }
  }

  const navBadge = document.getElementById('nav-proj-badge');
  if (navBadge) navBadge.textContent = myProjects.length;
}

function renderActivity() {
  const tl = document.getElementById('activity-timeline');
  if (!tl) return;

  const todayDateStr = fmtDate(Date.now());

  // DAILY REFRESH: Only display activities that occurred TODAY
  const todayActivities = (STATE.activityLog || []).filter(a => {
    if (!a.time && !a.date) return false;
    const aDateStr = a.date || fmtDate(a.time);
    return aDateStr === todayDateStr;
  });

  if (todayActivities.length === 0) {
    tl.innerHTML = `<div class="timeline-empty">
      <svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
      <p>No activity yet today. Check in to initiate your session!</p>
    </div>`;
    return;
  }

  tl.innerHTML = todayActivities.slice(0, 10).map(a => `
    <div class="timeline-item">
      <div class="timeline-dot ${a.color || 'purple'}"></div>
      <div class="timeline-body">
        <strong>${a.text}</strong>
        <span>Today · ${fmt(a.time)}</span>
      </div>
    </div>
  `).join('');
}

// ========================
// MODAL CONTROLS
// ========================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ========================
// INITIALIZATION
// ========================
function init() {
  load();
  evaluateAutoAbsent();
  syncProfileUI();
  syncAttendanceUI();
  renderAttLog();
  renderProjects();
  renderCalendars();
  updateDashCounts();
  updateCalendarCounts();
  renderActivity();
  renderAdminClients();
  renderAdminEmployees();
  renderAdminProjectsTime();
  syncClientsDatalist();
  updateAdminKpis();

  if (STATE.attendance.status === 'in' || STATE.attendance.status === 'lunch') {
    startAttElapsed();
  }

  // Restore active project timer ticker if one was saved as active
  if (STATE.activeProjectTimer) {
    updateProjectTimerTicker();
    syncActiveTaskTopbar();
  }

  checkEmployeeLogin();
  rotateQuote(false);

  console.log('%c DIGITAL AMNIK OS v2.5 ', 'background:#7c3aed;color:#fff;padding:6px 14px;border-radius:4px;font-weight:900;letter-spacing:1px');
  console.log('Digital Amnik Agency Operating System Ready');
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
}
