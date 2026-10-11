const taskList = document.getElementById("task-list");
const taskForm = document.getElementById("task-form");
const showFormButton = document.getElementById("show-form");
const cancelFormButton = document.getElementById("cancel-form");
const taskTitleInput = document.getElementById("task-title");
const messageBox = document.getElementById("message");

let allTasks = [];
let activeFilter = "all";
let messageTimer;

const STATUS_LABELS = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Completed",
};

const PRIORITY_LABELS = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function showMessage(message, type = "success") {
  clearTimeout(messageTimer);

  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
  messageBox.hidden = false;

  messageTimer = setTimeout(() => {
    messageBox.hidden = true;
  }, 3500);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function updateStatistics() {
  const total = allTasks.length;
  const completed = allTasks.filter((task) => task.status === "done").length;
  const inProgress = allTasks.filter(
    (task) => task.status === "in-progress"
  ).length;
  const todo = allTasks.filter((task) => task.status === "todo").length;

  document.getElementById("all-count").textContent = total;
  document.getElementById("todo-count").textContent = todo;
  document.getElementById("progress-count").textContent = inProgress;
  document.getElementById("done-count").textContent = completed;

  document.getElementById("total-stat").textContent = total;
  document.getElementById("active-stat").textContent = inProgress;
  document.getElementById("completed-stat").textContent = completed;
}

function createTaskCard(task) {
  const card = document.createElement("article");

  card.className = `task-card${task.status === "done" ? " is-done" : ""}`;

  const description = task.description
    ? `<p class="task-description">${escapeHtml(task.description)}</p>`
    : "";

  const statusOptions = Object.entries(STATUS_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${
          task.status === value ? "selected" : ""
        }>${label}</option>`
    )
    .join("");

  card.innerHTML = `
    <button
      class="task-check"
      type="button"
      data-action="toggle"
      data-id="${escapeHtml(task.id)}"
      aria-label="${task.status === "done" ? "Reopen" : "Complete"} task: ${escapeHtml(task.title)}"
      title="${task.status === "done" ? "Reopen task" : "Complete task"}"
    >
      <span class="check-symbol">${task.status === "done" ? "✓" : ""}</span>
    </button>

    <div class="task-main">
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      ${description}
      <div class="task-meta">
        <span class="priority-badge priority-${escapeHtml(task.priority)}">
          ${escapeHtml(PRIORITY_LABELS[task.priority] || "Medium priority")}
        </span>
        <span class="status-badge status-${escapeHtml(task.status)}">
          ${escapeHtml(STATUS_LABELS[task.status] || task.status)}
        </span>
      </div>
    </div>

    <div class="task-actions">
      <label>
        <span hidden>Change task status</span>
        <select
          class="task-status-select"
          data-action="status"
          data-id="${escapeHtml(task.id)}"
          aria-label="Status for ${escapeHtml(task.title)}"
        >
          ${statusOptions}
        </select>
      </label>

      <button
        class="delete-task"
        type="button"
        data-action="delete"
        data-id="${escapeHtml(task.id)}"
        aria-label="Delete task: ${escapeHtml(task.title)}"
        title="Delete task"
      >×</button>
    </div>
  `;

  return card;
}

function renderTasks() {
  const visibleTasks =
    activeFilter === "all"
      ? allTasks
      : allTasks.filter((task) => task.status === activeFilter);

  document.getElementById("visible-count").textContent = visibleTasks.length;

  taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const emptyTitle =
      activeFilter === "all"
        ? "Your space is clear"
        : `No ${STATUS_LABELS[activeFilter].toLowerCase()} tasks`;

    const emptyDescription =
      activeFilter === "all"
        ? "Add your first task and take that little first step."
        : "Tasks will appear here when they match this filter.";

    empty.innerHTML = `
      <div class="empty-icon">✦</div>
      <h3>${escapeHtml(emptyTitle)}</h3>
      <p>${escapeHtml(emptyDescription)}</p>
    `;

    taskList.appendChild(empty);
    return;
  }

  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskCard(task));
  });
}

async function loadTasks() {
  try {
    const data = await apiRequest("/api/tasks");
    allTasks = data.tasks;
    updateStatistics();
    renderTasks();
  } catch (error) {
    showMessage(`Couldn't load tasks: ${error.message}`, "error");
  }
}

function openTaskForm() {
  taskForm.hidden = false;
  showFormButton.hidden = true;
  taskTitleInput.focus();
}

function closeTaskForm() {
  taskForm.reset();
  taskForm.hidden = true;
  showFormButton.hidden = false;
}

showFormButton.addEventListener("click", openTaskForm);
cancelFormButton.addEventListener("click", closeTaskForm);

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = taskForm.querySelector('button[type="submit"]');

  const task = {
    title: taskTitleInput.value.trim(),
    description: document.getElementById("task-description").value.trim(),
    priority: document.getElementById("task-priority").value,
  };

  if (!task.title) {
    showMessage("Please enter a task title.", "error");
    taskTitleInput.focus();
    return;
  }

  submitButton.disabled = true;

  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });

    closeTaskForm();
    activeFilter = "all";

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === "all");
    });

    await loadTasks();
    showMessage("Your new task has been created!");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderTasks();
  });
});

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  const task = allTasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  if (action === "toggle") {
    const nextStatus = task.status === "done" ? "todo" : "done";
    await changeTaskStatus(id, nextStatus);
  }

  if (action === "delete") {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      await loadTasks();
      showMessage("Task deleted successfully.");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
});

taskList.addEventListener("change", async (event) => {
  const select = event.target.closest('[data-action="status"]');

  if (!select) {
    return;
  }

  await changeTaskStatus(select.dataset.id, select.value);
});

async function changeTaskStatus(id, status) {
  try {
    await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    await loadTasks();
    showMessage("Task status updated.");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function displayToday() {
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  document.getElementById("today").textContent = today;
}

displayToday();
loadTasks();