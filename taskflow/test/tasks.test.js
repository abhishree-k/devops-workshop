const test = require("node:test");
const assert = require("node:assert/strict");

const { createTaskStore } = require("../src/tasks");

test("creates a task with default values", () => {
  const store = createTaskStore();

  const task = store.createTask({ title: "Learn Docker" });

  assert.equal(task.id, "1");
  assert.equal(task.title, "Learn Docker");
  assert.equal(task.status, "todo");
  assert.equal(task.priority, "medium");
  assert.ok(task.createdAt);
  assert.ok(task.updatedAt);
});

test("trims whitespace from task titles", () => {
  const store = createTaskStore();

  const task = store.createTask({ title: "  Learn Git  " });

  assert.equal(task.title, "Learn Git");
});

test("rejects an empty task title", () => {
  const store = createTaskStore();

  assert.throws(
    () => store.createTask({ title: "   " }),
    /Task title is required/
  );
});

test("rejects an invalid priority", () => {
  const store = createTaskStore();

  assert.throws(
    () => store.createTask({
      title: "Learn testing",
      priority: "urgent",
    }),
    /Invalid task priority/
  );
});

test("updates a task status", () => {
  const store = createTaskStore();
  const task = store.createTask({ title: "Build TaskFlow" });

  const updated = store.updateTask(task.id, { status: "in-progress" });

  assert.equal(updated.status, "in-progress");
});

test("updates task title and priority", () => {
  const store = createTaskStore();
  const task = store.createTask({ title: "Old title" });

  const updated = store.updateTask(task.id, {
    title: "New title",
    priority: "high",
  });

  assert.equal(updated.title, "New title");
  assert.equal(updated.priority, "high");
});

test("rejects an invalid task status", () => {
  const store = createTaskStore();
  const task = store.createTask({ title: "Write tests" });

  assert.throws(
    () => store.updateTask(task.id, { status: "waiting" }),
    /Invalid task status/
  );
});

test("returns null when updating a nonexistent task", () => {
  const store = createTaskStore();

  assert.equal(
    store.updateTask("999", { status: "done" }),
    null
  );
});

test("deletes a task", () => {
  const store = createTaskStore();
  const task = store.createTask({ title: "Temporary task" });

  assert.equal(store.deleteTask(task.id), true);
  assert.equal(store.listTasks().length, 0);
});

test("returns false when deleting a nonexistent task", () => {
  const store = createTaskStore();

  assert.equal(store.deleteTask("999"), false);
});

test("assigns unique IDs to tasks", () => {
  const store = createTaskStore();

  const first = store.createTask({ title: "First task" });
  const second = store.createTask({ title: "Second task" });

  assert.notEqual(first.id, second.id);
});

test("keeps task stores independent", () => {
  const firstStore = createTaskStore();
  const secondStore = createTaskStore();

  firstStore.createTask({ title: "First store task" });

  assert.equal(firstStore.listTasks().length, 1);
  assert.equal(secondStore.listTasks().length, 0);
});