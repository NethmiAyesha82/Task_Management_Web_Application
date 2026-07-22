const STORAGE_KEY = "taskflow.tasks";

const els = {
  openAddModal: document.getElementById("openAddModal"),
  taskModal: document.getElementById("taskModal"),
  taskForm: document.getElementById("taskForm"),
  closeModal: document.getElementById("closeModal"),
  taskId: document.getElementById("taskId"),
  title: document.getElementById("title"),
  description: document.getElementById("description"),
  dueDate: document.getElementById("dueDate"),
  priority: document.getElementById("priority"),
  todoList: document.getElementById("todoList"),
  inprogressList: document.getElementById("inprogressList"),
  completedList: document.getElementById("completedList"),
  template: document.getElementById("taskTemplate"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  priorityFilter: document.getElementById("priorityFilter"),
  dueFromFilter: document.getElementById("dueFromFilter"),
  dueToFilter: document.getElementById("dueToFilter"),
  clearFilters: document.getElementById("clearFilters"),
  confirmDialog: document.getElementById("confirmDialog"),
  confirmYes: document.getElementById("confirmYes"),
  confirmNo: document.getElementById("confirmNo"),
  logoutBtn: document.getElementById("logoutBtn"), 
};

let tasks = loadTasks();
let pendingDeleteId = null;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

els.openAddModal.addEventListener("click", () => openModal());
els.closeModal.addEventListener("click", () => els.taskModal.close());
els.taskForm.addEventListener("submit", handleSubmit);

function openModal(task = null) {
  els.taskForm.reset();
  els.taskId.value = task ? task.id : "";
  document.getElementById("modalTitle").textContent = task ? "Edit task" : "Add task";
  if (task) {
    els.title.value = task.title;
    els.description.value = task.description || "";
    els.dueDate.value = task.dueDate || "";
    els.priority.value = task.priority || "medium";
  }
  els.taskModal.showModal();
}

function handleSubmit(e) {
  e.preventDefault();
  const id = els.taskId.value || crypto.randomUUID();
  const title = els.title.value.trim();
  if (!title) return;

  const newTask = {
    id,
    title,
    description: els.description.value.trim(),
    dueDate: els.dueDate.value || "",
    priority: els.priority.value,
    status: tasks.find(t => t.id === id)?.status || "todo",
    createdAt: tasks.find(t => t.id === id)?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  const exists = tasks.some(t => t.id === id);
  tasks = exists ? tasks.map(t => (t.id === id ? newTask : t)) : [newTask, ...tasks];
  saveTasks();
  render();
  els.taskModal.close();
}

function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById("confirmText").textContent = "Delete this task permanently?";
  els.confirmDialog.showModal();
}
els.confirmNo.addEventListener("click", () => {
  pendingDeleteId = null;
  els.confirmDialog.close();
});
els.confirmYes.addEventListener("click", () => {
  if (!pendingDeleteId) return;
  tasks = tasks.filter(t => t.id !== pendingDeleteId);
  saveTasks();
  render();
  pendingDeleteId = null;
  els.confirmDialog.close();
});

[els.searchInput, els.statusFilter, els.priorityFilter, els.dueFromFilter, els.dueToFilter]
  .forEach(el => el.addEventListener("input", () => render()));

els.clearFilters.addEventListener("click", () => {
  els.searchInput.value = "";
  els.statusFilter.value = "all";
  els.priorityFilter.value = "all";
  els.dueFromFilter.value = "";
  els.dueToFilter.value = "";
  render();
});

function applyFilters(list) {
  const q = els.searchInput.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const prio = els.priorityFilter.value;
  const from = els.dueFromFilter.value ? new Date(els.dueFromFilter.value) : null;
  const to = els.dueToFilter.value ? new Date(els.dueToFilter.value) : null;

  return list.filter(t => {
    const matchText = !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    const matchStatus = status === "all" || t.status === status;
    const matchPrio = prio === "all" || t.priority === prio;
    const due = t.dueDate ? new Date(t.dueDate) : null;
    const matchFrom = !from || (due && due >= from);
    const matchTo = !to || (due && due <= to);
    return matchText && matchStatus && matchPrio && matchFrom && matchTo;
  });
}

function render() {
  [els.todoList, els.inprogressList, els.completedList].forEach(list => (list.innerHTML = ""));
  const filtered = applyFilters(tasks);

  const groups = {
    todo: filtered.filter(t => t.status === "todo"),
    inprogress: filtered.filter(t => t.status === "inprogress"),
    completed: filtered.filter(t => t.status === "completed"),
  };

  Object.entries(groups).forEach(([status, list]) => {
    const target =
      status === "todo" ? els.todoList :
      status === "inprogress" ? els.inprogressList : els.completedList;
    list.forEach(task => target.appendChild(buildTaskCard(task)));
  });
}

function buildTaskCard(task) {
  const card = els.template.content.firstElementChild.cloneNode(true);
  card.dataset.id = task.id;

  const badge = card.querySelector(".priority-badge");
  badge.textContent = task.priority;
  badge.classList.add(`priority-${task.priority}`);

  card.querySelector(".task-title").textContent = task.title;
  card.querySelector(".task-desc").textContent = task.description || "";

  const dueEl = card.querySelector(".due");
  dueEl.textContent = task.dueDate ? `Due: ${task.dueDate}` : "No due date";

  const select = card.querySelector(".status-select");
  select.value = task.status;
  select.addEventListener("change", e => {
    const newStatus = e.target.value;

    card.style.transition = "opacity .15s ease, transform .15s ease";
    card.style.opacity = "0.2";
    card.style.transform = "scale(0.98)";
    setTimeout(() => {
      tasks = tasks.map(t => (t.id === task.id ? { ...t, status: newStatus, updatedAt: Date.now() } : t));
      saveTasks();
      render();
    }, 120);
  });

  card.querySelector(".edit").addEventListener("click", () => openModal(task));
  card.querySelector(".delete").addEventListener("click", () => confirmDelete(task.id));

  return card;
}

document.addEventListener("DOMContentLoaded", () => {
  if (tasks.length === 0) {
    tasks = [
      { id: crypto.randomUUID(), title: "Plan weekly schedule", description: "Outline priorities", dueDate: "", priority: "medium", status: "todo", createdAt: Date.now(), updatedAt: Date.now() },
      { id: crypto.randomUUID(), title: "Buy groceries", description: "Milk, eggs, bread", dueDate: "", priority: "low", status: "inprogress", createdAt: Date.now(), updatedAt: Date.now() },
      { id: crypto.randomUUID(), title: "Submit assignment", description: "Task management web app", dueDate: new Date().toISOString().slice(0,10), priority: "high", status: "completed", createdAt: Date.now(), updatedAt: Date.now() },
    ];
    saveTasks();
  }
  render();

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }
});
