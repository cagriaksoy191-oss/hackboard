export default function TaskForm({ form, setForm, users, onSubmit, onCancel, submitText }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-secondary mb-1">Baslik *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200"
          placeholder="Gorev basligi..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-1">Aciklama</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 resize-none"
          placeholder="Gorev aciklamasi..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Oncelik</label>
          <select
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
          <label className="block text-sm font-medium text-secondary mb-1">Tahmini Sure (saat)</label>
          <input
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
        <label className="block text-sm font-medium text-secondary mb-1">Atanan Kisi</label>
        <select
          value={form.assigned_to}
          onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
          className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
        >
          <option value="" className="option-surface">Seciniz</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} className="option-surface">{u.name} - {u.role}</option>
          ))}
        </select>
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
