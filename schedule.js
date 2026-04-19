// ─── Weekday helpers ─────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toggleAllDays(btn) {
  if (btn.classList.contains("active")) return;
  btn.classList.add("active");
  document.querySelectorAll(".day-btn[data-day]").forEach((b) =>
    b.classList.remove("active")
  );
}

function toggleDayBtn(btn) {
  document.querySelector(".day-btn.all-days")?.classList.remove("active");
  btn.classList.toggle("active");
  const anySelected =
    document.querySelectorAll(".day-btn[data-day].active").length > 0;
  if (!anySelected)
    document.querySelector(".day-btn.all-days")?.classList.add("active");
}

function getSelectedDays() {
  const allActive = document.querySelector(".day-btn.all-days")?.classList.contains("active");
  if (allActive) return [];
  const days = [];
  document.querySelectorAll(".day-btn[data-day].active").forEach((b) =>
    days.push(parseInt(b.dataset.day))
  );
  return days;
}

function fillDaysSelection(allowedDays) {
  const allBtn = document.querySelector(".day-btn.all-days");
  const dayBtns = document.querySelectorAll(".day-btn[data-day]");
  if (!allowedDays || allowedDays.length === 0) {
    allBtn?.classList.add("active");
    dayBtns.forEach((b) => b.classList.remove("active"));
  } else {
    allBtn?.classList.remove("active");
    dayBtns.forEach((b) => {
      b.classList.toggle("active", allowedDays.includes(parseInt(b.dataset.day)));
    });
  }
}

function resetDaysSelection() {
  document.querySelector(".day-btn.all-days")?.classList.add("active");
  document.querySelectorAll(".day-btn[data-day]").forEach((b) =>
    b.classList.remove("active")
  );
}

function formatAllowedDays(allowedDays) {
  if (!allowedDays || allowedDays.length === 0) return "Every day";
  return allowedDays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d])
    .join(", ");
}

// ─── Timezone helpers (Baku = UTC+4, no DST) ─────────────────────────────────

function bakuToUtc(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const utcMin = (((h * 60 + m) - 4 * 60) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(utcMin / 60)).padStart(2, "0")}:${String(utcMin % 60).padStart(2, "0")}`;
}

function utcToBaku(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const bakuMin = (h * 60 + m + 4 * 60) % (24 * 60);
  return `${String(Math.floor(bakuMin / 60)).padStart(2, "0")}:${String(bakuMin % 60).padStart(2, "0")}`;
}

// ─── Schedule sidebar ────────────────────────────────────────────────────────

async function loadSchedules() {
  const list = document.getElementById("scheduleList");
  list.innerHTML = "";

  for (const motorObj of motorMarkers) {
    if (motorObj.data.mode === "auto") continue; // handled by renderAutoSidebar
    const motor = motorObj.data;
    const shortCode = motor.deviceCode
      ? motor.deviceCode.slice(0, 8)
      : motor.id.slice(0, 8);

    let schedule = null;
    try {
      const res = await fetch(
        `http://localhost:5212/api/schedule/motor/${motor.id}`,
        { headers: authHeaders() }
      );
      if (res.ok) schedule = await res.json();
    } catch {}

    // Keep the cached schedule on the motor object fresh
    motorObj.data.schedule = schedule ?? null;

    if (!schedule) continue;

    const daysText = formatAllowedDays(schedule.allowedDays);

    const infoText =
      schedule.scheduleType === "time"
        ? schedule.timeWindows
            .map((w) => `${utcToBaku(w.startTime)} (${w.durationMinutes} min)`)
            .join(", ") || "No windows set"
        : `Every ${schedule.intervalHours}h · ${schedule.durationMinutes} min`;

    const lastRanText = schedule.lastRanAt
      ? "Last: " + new Date(schedule.lastRanAt).toLocaleTimeString()
      : "Not run yet";

    const item = document.createElement("div");
    item.className = "schedule-item";
    item.innerHTML = `
      <div class="schedule-motor">${shortCode}</div>
      <div class="schedule-info">${infoText}</div>
      <div class="schedule-info">${daysText}</div>
      <div class="schedule-info">${schedule.scheduleType === "interval" ? lastRanText : ""}</div>
      <div class="schedule-actions">
        <button class="schedule-btn toggle ${schedule.isEnabled ? "" : "disabled"}"
          onclick="toggleSchedule('${schedule.id}', ${schedule.isEnabled})">
          ${schedule.isEnabled ? "Enabled" : "Disabled"}
        </button>
        <button class="schedule-btn delete"
          onclick="deleteSchedule('${schedule.id}')">
          Remove
        </button>
      </div>
    `;
    list.appendChild(item);
  }

  renderAutoSidebar();
}

function renderAutoSidebar() {
  const list = document.getElementById("scheduleList");
  if (!list) return;

  // Remove previous auto section
  list.querySelector(".auto-sidebar-section")?.remove();

  const autoMotors = motorMarkers.filter(
    (m) => m.data.mode === "auto" && (m.data.linkedSensorCodes?.length ?? 0) > 0
  );
  if (autoMotors.length === 0) return;

  const section = document.createElement("div");
  section.className = "auto-sidebar-section";

  if (list.children.length > 0) {
    const divider = document.createElement("div");
    divider.className = "auto-sidebar-divider";
    divider.textContent = "AUTO MODE";
    section.appendChild(divider);
  }

  for (const motorObj of autoMotors) {
    const motor = motorObj.data;
    const shortCode = motor.deviceCode
      ? motor.deviceCode.slice(0, 8)
      : motor.id.slice(0, 8);

    const sensorBits = (motor.linkedSensorCodes ?? []).map((code) => {
      const sObj = sensorMarkers.find((s) => s.data.deviceCode === code);
      const m = sObj?.data?.soilMoisture;
      return `<span class="auto-sensor-tag">${code.slice(0, 7)}${m != null ? ` <b>${m}%</b>` : ""}</span>`;
    }).join("");

    const statusText = motor.isActive ? "Irrigating" : "Monitoring";
    const statusClass = motor.isActive ? "active" : "";

    const item = document.createElement("div");
    item.className = "schedule-item auto-schedule-item";
    item.innerHTML = `
      <div class="schedule-motor">${shortCode}</div>
      <div class="schedule-info auto-sensor-row">${sensorBits || "—"}</div>
      <div class="schedule-info">ON &lt; ${motor.lowerThreshold}% · OFF &gt; ${motor.upperThreshold}%</div>
      <div class="schedule-info auto-status ${statusClass}">${statusText}</div>
      <div class="schedule-actions">
        <button class="schedule-btn toggle"
          onclick="pauseAutoMode('${motor.id}')">
          Pause
        </button>
        <button class="schedule-btn"
          style="background:#f3f4f6; color:#374151; border-color:#d1d5db;"
          onclick="editAutoConfig('${motor.id}')">
          Edit
        </button>
      </div>
    `;
    section.appendChild(item);
  }

  list.appendChild(section);
}

async function pauseAutoMode(motorId) {
  try {
    const res = await fetch(`http://localhost:5212/api/motor/${motorId}/mode`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ mode: "manual" }),
    });
    if (!res.ok) throw new Error();
    const motorObj = motorMarkers.find((m) => m.id === motorId);
    if (motorObj) {
      motorObj.data.mode = "manual";
      motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
      renderMotorSidebar?.();
    }
    showActionMessage("Auto mode paused. Motor is now in manual mode.");
    loadSchedules();
  } catch {
    showErrorMessage("Failed to pause auto mode.");
  }
}

function editAutoConfig(motorId) {
  const motorObj = motorMarkers.find((m) => m.id === motorId);
  if (!motorObj) return;
  map.setView([motorObj.data.lat, motorObj.data.lng], 18);
  motorObj.marker.openPopup();
}

async function toggleSchedule(scheduleId, currentlyEnabled) {
  try {
    const res = await fetch(
      `http://localhost:5212/api/schedule/${scheduleId}/toggle`,
      { method: "PATCH", headers: authHeaders() }
    );
    if (!res.ok) throw new Error();

    // Backend already updated motor mode — mirror it in the UI
    const newEnabled = !currentlyEnabled;
    const motorObj = motorMarkers.find((m) => m.data.schedule?.id === scheduleId);
    if (motorObj) {
      motorObj.data.mode = newEnabled ? "scheduled" : "manual";
      motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
      renderMotorSidebar?.();
    }

    loadSchedules();
  } catch {
    showErrorMessage("Failed to toggle schedule.");
  }
}

async function deleteSchedule(scheduleId) {
  try {
    const res = await fetch(
      `http://localhost:5212/api/schedule/${scheduleId}`,
      { method: "DELETE", headers: authHeaders() }
    );
    if (!res.ok) throw new Error();

    // Backend already reverted motor mode to "manual" — mirror it in the UI
    const motorObj = motorMarkers.find((m) => m.data.schedule?.id === scheduleId);
    if (motorObj) {
      motorObj.data.mode = "manual";
      motorObj.data.schedule = null;
      motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
      renderMotorSidebar?.();
    }

    showActionMessage("Schedule removed.");
    loadSchedules();
  } catch {
    showErrorMessage("Failed to delete schedule.");
  }
}

// ─── Schedule modal ───────────────────────────────────────────────────────────

let _scheduleMotorId = null;
let _currentScheduleTab = "interval";

function switchScheduleTab(type) {
  _currentScheduleTab = type;

  const intervalSection = document.getElementById("scheduleIntervalSection");
  const timeSection = document.getElementById("scheduleTimeSection");
  const tabInterval = document.getElementById("scheduleTabInterval");
  const tabTime = document.getElementById("scheduleTabTime");

  const activeStyle =
    "flex:1; padding:7px; border-radius:8px; border:1px solid #216c3c; background:#216c3c; color:white; font-size:13px; cursor:pointer;";
  const inactiveStyle =
    "flex:1; padding:7px; border-radius:8px; border:1px solid #d1d5db; background:white; color:#374151; font-size:13px; cursor:pointer;";

  if (type === "interval") {
    intervalSection.style.display = "block";
    timeSection.style.display = "none";
    tabInterval.style.cssText = activeStyle;
    tabTime.style.cssText = inactiveStyle;
  } else {
    intervalSection.style.display = "none";
    timeSection.style.display = "block";
    tabInterval.style.cssText = inactiveStyle;
    tabTime.style.cssText = activeStyle;
  }
}

function addTimeWindow(startTime = "", durationMinutes = "") {
  const list = document.getElementById("scheduleWindowList");
  const row = document.createElement("div");
  row.style.cssText = "display:flex; gap:8px; align-items:center;";
  row.innerHTML = `
    <input type="time" value="${startTime}"
      style="flex:1; padding:7px 10px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; outline:none;" />
    <input type="number" min="1" max="120" placeholder="min" value="${durationMinutes}"
      style="width:70px; padding:7px 10px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; outline:none;" />
    <button onclick="this.parentElement.remove()"
      style="background:none; border:none; color:#ef4444; font-size:18px; cursor:pointer; line-height:1;">×</button>
  `;
  list.appendChild(row);
}

function getTimeWindows() {
  const rows = document.querySelectorAll("#scheduleWindowList > div");
  const windows = [];
  for (const row of rows) {
    const [timeInput, durInput] = row.querySelectorAll("input");
    const startTime = timeInput.value.trim();
    const duration = parseInt(durInput.value);
    if (!startTime || !duration || duration < 1) continue;
    windows.push({ startTime: bakuToUtc(startTime), durationMinutes: duration });
  }
  return windows;
}

// ─── Safety panel helpers ─────────────────────────────────────────────────────

function toggleSafetyPanel() {
  const panel = document.getElementById("safetyPanel");
  const chevron = document.getElementById("safetyChevron");
  const isHidden = panel.style.display === "none" || panel.style.display === "";
  panel.style.display = isHidden ? "flex" : "none";
  chevron.textContent = isHidden ? "−" : "+";
}

function resetSafetyFields() {
  document.getElementById("safetyMaxRuntime").value = "0";
  document.getElementById("safetyForbidFrom").value = "";
  document.getElementById("safetyForbidTo").value = "";
  document.getElementById("safetySensorCode").value = "";
  document.getElementById("safetyFreshnessMinutes").value = "0";
  // Collapse the panel
  document.getElementById("safetyPanel").style.display = "none";
  document.getElementById("safetyChevron").textContent = "+";
}

function fillSafetyFields(schedule) {
  document.getElementById("safetyMaxRuntime").value = schedule.maxRuntimeMinutes ?? 0;
  document.getElementById("safetySensorCode").value = schedule.linkedSensorCode ?? "";
  document.getElementById("safetyFreshnessMinutes").value = schedule.dataFreshnessMinutes ?? 0;

  if (schedule.forbiddenFromHour != null) {
    const h = (schedule.forbiddenFromHour + 4) % 24;
    document.getElementById("safetyForbidFrom").value =
      String(h).padStart(2, "0") + ":00";
  }
  if (schedule.forbiddenToHour != null) {
    const h = (schedule.forbiddenToHour + 4) % 24;
    document.getElementById("safetyForbidTo").value =
      String(h).padStart(2, "0") + ":00";
  }
}

function getSafetyRules() {
  const maxRuntime = parseInt(document.getElementById("safetyMaxRuntime").value) || 0;
  const sensorCode = document.getElementById("safetySensorCode").value.trim();
  const freshnessMinutes = parseInt(document.getElementById("safetyFreshnessMinutes").value) || 0;

  const fromVal = document.getElementById("safetyForbidFrom").value;
  const toVal   = document.getElementById("safetyForbidTo").value;

  const forbiddenFromHour = fromVal
    ? ((parseInt(fromVal.split(":")[0]) - 4) + 24) % 24
    : null;
  const forbiddenToHour = toVal
    ? ((parseInt(toVal.split(":")[0]) - 4) + 24) % 24
    : null;

  return { maxRuntimeMinutes: maxRuntime, forbiddenFromHour, forbiddenToHour,
           linkedSensorCode: sensorCode || null, dataFreshnessMinutes: freshnessMinutes };
}

// ─── Schedule modal open ──────────────────────────────────────────────────────

function openSchedulePanel(motorId) {
  _scheduleMotorId = motorId;

  // Reset all fields
  switchScheduleTab("interval");
  document.getElementById("scheduleInterval").value = "3";
  document.getElementById("scheduleDuration").value = "";
  document.getElementById("scheduleWindowList").innerHTML = "";
  resetSafetyFields();
  resetDaysSelection();

  // Pre-fill if a schedule already exists for this motor
  fetch(`http://localhost:5212/api/schedule/motor/${motorId}`, {
    headers: authHeaders(),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((schedule) => {
      if (!schedule) return;

      if (schedule.scheduleType === "time") {
        switchScheduleTab("time");
        for (const w of schedule.timeWindows) {
          addTimeWindow(utcToBaku(w.startTime), w.durationMinutes);
        }
      } else {
        document.getElementById("scheduleInterval").value = schedule.intervalHours;
        document.getElementById("scheduleDuration").value = schedule.durationMinutes;
      }

      fillSafetyFields(schedule);
      fillDaysSelection(schedule.allowedDays);
    })
    .catch(() => {});

  const modal = document.getElementById("scheduleModal");
  modal.classList.remove("hidden");

  document.getElementById("scheduleCancelBtn").onclick = () => {
    modal.classList.add("hidden");
    _scheduleMotorId = null;
  };

  document.getElementById("scheduleConfirmBtn").onclick = async () => {
    const btn = document.getElementById("scheduleConfirmBtn");

    let payload;

    const safety = getSafetyRules();
    const allowedDays = getSelectedDays();

    if (_currentScheduleTab === "time") {
      const windows = getTimeWindows();
      if (windows.length === 0) {
        showErrorMessage("Add at least one time window.");
        return;
      }
      payload = {
        motorId: _scheduleMotorId,
        scheduleType: "time",
        intervalHours: 0,
        durationMinutes: 0,
        timeWindows: windows,
        allowedDays,
        ...safety,
      };
    } else {
      const interval = parseInt(document.getElementById("scheduleInterval").value);
      const duration = parseInt(document.getElementById("scheduleDuration").value);
      if (!duration || duration < 1) {
        showErrorMessage("Please enter a valid duration.");
        return;
      }
      payload = {
        motorId: _scheduleMotorId,
        scheduleType: "interval",
        intervalHours: interval,
        durationMinutes: duration,
        timeWindows: [],
        allowedDays,
        ...safety,
      };
    }

    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const res = await fetch("http://localhost:5212/api/schedule", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const savedSchedule = await res.json();

      // Turn motor OFF — schedule owns it now
      await fetch(
        `http://localhost:5212/api/motor/${_scheduleMotorId}/status`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ isActive: false }),
        }
      );

      const motorObj = motorMarkers.find((m) => m.id === _scheduleMotorId);
      if (motorObj) {
        // Update all local state so popup and sidebar stay accurate
        motorObj.data.isActive = false;
        motorObj.data.mode = "scheduled";
        motorObj.data.schedule = savedSchedule;

        if (motorObj.data.deviceCode && window.firebaseDb) {
          const motorDocRef = window.firestoreDoc(
            window.firebaseDb, "Motors", motorObj.data.deviceCode
          );
          await window.firestoreUpdateDoc(motorDocRef, { isActive: false }).catch(() => {});
        }

        motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
        renderMotorSidebar?.();
      }

      modal.classList.add("hidden");
      _scheduleMotorId = null;

      const confirmMsg =
        payload.scheduleType === "time"
          ? `Schedule saved! ${payload.timeWindows.length} time window(s) set.`
          : `Schedule saved! Motor will run every ${payload.intervalHours}h.`;
      showActionMessage(confirmMsg);
      loadSchedules();
    } catch (err) {
      showErrorMessage(err.message || "Failed to save schedule.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Schedule";
    }
  };
}
