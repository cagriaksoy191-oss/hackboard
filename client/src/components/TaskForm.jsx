export default function TaskForm({ form, setForm, users, onSubmit, onCancel, submitText }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-secondary mb-1">Baslik *</label>
        <input
          id="task-title"
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200"
          placeholder="Gorev basligi..."
        />
      </div>

      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-secondary mb-1">Aciklama</label>
        <textarea
          id="task-description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 resize-none"
          placeholder="Gorev aciklamasi..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="task-priority" className="block text-sm font-medium text-secondary mb-1">Oncelik</label>
          <select
            id="task-priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
          >
            <option value="low" className="option-surface">Dusuk</option>
            <option value="medium" className="option-surface">Orta</option>
            <option value="high" className="option-surface">Yuksek</option>
            <option value="critical" className="option-surface">Kritik</option>
          </select>
        </div>

        <div>
          <label htmlFor="task-estimated-hours" className="block text-sm font-medium text-secondary mb-1">Tahmini Sure (saat)</label>
          <input
            id="task-estimated-hours"
            type="number"
            min="0"
            step="0.5"
            value={form.estimated_hours}
            onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
            className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Atanan Kişiler (Çoklu Seçim)</label>
        <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-2.5 input-surface border-theme rounded-xl bg-[var(--bg-input)]">
          {users.map((u) => {
            const isChecked = (form.assignee_ids || []).includes(u.id);
            return (
              <label key={u.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--interactive-hover)] cursor-pointer transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const currentIds = form.assignee_ids || [];
                    const newIds = isChecked
                      ? currentIds.filter(id => id !== u.id)
                      : [...currentIds, u.id];
                    setForm({ ...form, assignee_ids: newIds });
                  }}
                  className="rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary-muted)]"
                />
                <span className="text-[11px] text-[var(--text-primary)] font-medium truncate">{u.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="task-due-date" className="block text-sm font-medium text-secondary mb-1">Bitiş Tarihi (Zaman Çizelgesi)</label>
        <input
          id="task-due-date"
          type="datetime-local"
          value={form.due_date ? form.due_date.substring(0, 16) : ''}
          onChange={(e) => setForm({ ...form, due_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
          className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 surface-bg border border-theme rounded-xl text-primary hover-surface-bg-hover transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Iptal
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent to-accentAlt text-white font-medium rounded-xl hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {submitText}
        </button>
      </div>
    </form>
  );
}
