// src/services/reminderStorage.js
//
// Payment reminders — thin client over /api/reminders.

import { apiGet, apiPost, apiPut } from "./api";

export const REMINDER_EVENT = "auto-finance:reminders-updated";

// Where the Reminders page kept its data before it moved to the API.
const LEGACY_STORAGE_KEY = "auto_finance_reminders";

const notifyRemindersUpdated = () => {
  window.dispatchEvent(new CustomEvent(REMINDER_EVENT));
};

/*
 * One-time upload of reminders saved in this browser before the API
 * existed. Each record leaves local storage only once the server has it,
 * so a failed upload resumes on the next load without duplicating or
 * losing anything.
 */
const migrateLegacyReminders = async () => {
  let legacy;

  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
  } catch {
    return;
  }

  if (!Array.isArray(legacy) || legacy.length === 0) {
    return;
  }

  // Stored newest first; upload oldest first so server ids follow the
  // original order.
  const pending = [...legacy];

  try {
    while (pending.length > 0) {
      await apiPost("/reminders", pending[pending.length - 1]);
      pending.pop();

      if (pending.length > 0) {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(pending));
      } else {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Failed to upload locally saved reminders:", error);
  }
};

let migration = null;

export const getReminders = async () => {
  migration ??= migrateLegacyReminders();
  await migration;

  try {
    const reminders = await apiGet("/reminders");

    return Array.isArray(reminders) ? reminders : [];
  } catch (error) {
    console.error("Failed to load reminders:", error);

    return [];
  }
};

export const addReminder = async (reminder) => {
  const saved = await apiPost("/reminders", reminder);

  notifyRemindersUpdated();

  return saved;
};

export const updateReminder = async (reminderId, updates) => {
  const saved = await apiPut(`/reminders/${reminderId}`, updates);

  notifyRemindersUpdated();

  return saved;
};
