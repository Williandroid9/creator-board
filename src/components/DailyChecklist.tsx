import { useState, type FormEvent } from "react";
import type { DailyTask } from "../types";
import { Button } from "./ui";

type DailyChecklistProps = {
  tasks: DailyTask[];
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onAdd: (title: string) => void;
  onReset: () => void;
};

export function DailyChecklist({ tasks, onToggle, onRename, onRemove, onAdd, onReset }: DailyChecklistProps) {
  const [newTask, setNewTask] = useState("");

  function submitTask(event: FormEvent) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) {
      return;
    }

    onAdd(title);
    setNewTask("");
  }

  return (
    <aside className="clean-panel rounded-2xl p-5 2xl:sticky 2xl:top-5 2xl:self-start">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Checklist</p>
          <h2 className="text-xl font-black">Rotina</h2>
        </div>
        <Button className="min-h-9 px-3 text-xs" onClick={onReset}>
          Resetar
        </Button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 rounded-xl bg-white/[0.045] p-2">
            <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} className="h-5 w-5 accent-aqua" />
            <input
              value={task.title}
              onChange={(event) => onRename(task.id, event.target.value)}
              className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none ${
                task.done ? "text-slate-500 line-through" : "text-slate-100"
              }`}
            />
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"
              onClick={() => onRemove(task.id)}
              title="Remover tarefa"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <form className="mt-4 flex gap-2" onSubmit={submitTask}>
        <input
          className="field-control py-2"
          placeholder="Nova tarefa"
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
        />
        <Button variant="primary" className="shrink-0" type="submit">
          +
        </Button>
      </form>
    </aside>
  );
}
