const VALID_STATUSES = ["todo", "in-progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];

function createTaskStore() {
  let tasks = [];
  let nextId = 1;

  function createTask(data) {
    if (!data || typeof data.title !== "string" || !data.title.trim()) {
      throw new Error("Task title is required.");
    }

    const priority = data.priority || "medium";

    if (!VALID_PRIORITIES.includes(priority)) {
      throw new Error("Invalid task priority.");
    }

    const now = new Date().toISOString();

    const task = {
      id: String(nextId++),
      title: data.title.trim(),
      description:
        typeof data.description === "string" ? data.description.trim() : "",
      status: "todo",
      priority,
      createdAt: now,
      updatedAt: now,
    };

    tasks.push(task);
    return { ...task };
  }

  function listTasks() {
    return tasks.map((task) => ({ ...task }));
  }

  function updateTask(id, changes) {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return null;
    }

    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      throw new Error("Invalid task updates.");
    }

    if ("title" in changes) {
      if (typeof changes.title !== "string" || !changes.title.trim()) {
        throw new Error("Task title cannot be empty.");
      }
      task.title = changes.title.trim();
    }

    if ("description" in changes) {
      if (typeof changes.description !== "string") {
        throw new Error("Description must be text.");
      }
      task.description = changes.description.trim();
    }

    if ("status" in changes) {
      if (!VALID_STATUSES.includes(changes.status)) {
        throw new Error("Invalid task status.");
      }
      task.status = changes.status;
    }

    if ("priority" in changes) {
      if (!VALID_PRIORITIES.includes(changes.priority)) {
        throw new Error("Invalid task priority.");
      }
      task.priority = changes.priority;
    }

    task.updatedAt = new Date().toISOString();
    return { ...task };
  }

  function deleteTask(id) {
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return false;
    }

    tasks.splice(index, 1);
    return true;
  }

  return { createTask, listTasks, updateTask, deleteTask };
}

module.exports = {
  createTaskStore,
  VALID_STATUSES,
  VALID_PRIORITIES,
};
