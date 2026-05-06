import { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { SEED_TASKS } from '@/lib/data/seed';

interface TaskFilters {
  customerId?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
}

let store: Task[] = structuredClone(SEED_TASKS);

export function getTasks(filters?: TaskFilters): Task[] {
  let result = store;

  if (filters?.customerId) {
    result = result.filter((t) => t.customerId === filters.customerId);
  }
  if (filters?.status?.length) {
    result = result.filter((t) => filters.status!.includes(t.status));
  }
  if (filters?.priority?.length) {
    result = result.filter((t) => filters.priority!.includes(t.priority));
  }

  return result;
}

export function getTasksForCustomer(customerId: string): Task[] {
  return store.filter((t) => t.customerId === customerId);
}

export function addTask(
  draft: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
): Task {
  const now = new Date().toISOString();
  const task: Task = {
    ...structuredClone(draft),
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  store = [...store, task];
  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
  const index = store.findIndex((t) => t.id === id);
  if (index === -1) return undefined;

  const updated: Task = {
    ...store[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  store = [...store.slice(0, index), updated, ...store.slice(index + 1)];
  return updated;
}
